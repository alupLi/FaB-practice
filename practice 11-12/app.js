const express = require('express');
const cors = require('cors');
const { nanoid } = require('nanoid');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const app = express();
const port = 3000;

app.use(cors({
    origin: 'http://localhost:3001',
    credentials: true
}));

const JWT_SECRET = 'secret_key';
const REFRESH_SECRET = 'refresh_secret_key';

const ACCESS_EXPIRES_IN = '15m';
const REFRESH_EXPIRES_IN = '7d';

let refreshTokens = new Set();

app.use(express.json());

let users = [];

let products = [];

async function initializeUsers() {
    const adminPassword = await hashPassword('123');
    const sellerPassword = await hashPassword('123');
    const userPassword = await hashPassword('123');

    users.push(
        {
            id: nanoid(),
            email: 'admin@gmail.com',
            first_name: 'Admin',
            last_name: 'User',
            password: adminPassword,
            role: 'admin',
            isBlocked: false
        },
        {
            id: nanoid(),
            email: 'seller@gmail.com',
            first_name: 'Seller',
            last_name: 'User',
            password: sellerPassword,
            role: 'seller',
            isBlocked: false
        },
        {
            id: nanoid(),
            email: 'user@gmail.com',
            first_name: 'Regular',
            last_name: 'User',
            password: userPassword,
            role: 'user',
            isBlocked: false
        }
    );
}

initializeUsers();

async function hashPassword(password) {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
}

async function verifyPassword(password, passwordHash) {
    return bcrypt.compare(password, passwordHash);
}

function generateAccessToken(user) {
    return jwt.sign(
        {
            sub: user.id,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            role: user.role
        },
        JWT_SECRET,
        { expiresIn: ACCESS_EXPIRES_IN }
    );
}

function generateRefreshToken(user) {
    return jwt.sign(
        {
            sub: user.id,
            email: user.email,
            role: user.role
        },
        REFRESH_SECRET,
        { expiresIn: REFRESH_EXPIRES_IN }
    );
}

function authMiddleware(req, res, next) {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token) {
        return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }

    try {
        const payload = jwt.verify(token, JWT_SECRET);
        req.user = payload;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}

function roleMiddleware(allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const user = users.find(u => u.id === req.user.sub);
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        if (user.isBlocked) {
            return res.status(403).json({ error: 'User is blocked' });
        }

        if (!allowedRoles.includes(user.role)) {
            return res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
        }

        next();
    };
}

const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'API AUTH and PRODUCTS with RBAC',
            version: '1.0.0',
            description: 'API с системой ролей (RBAC)',
        },
        servers: [
            {
                url: `http://localhost:${port}`,
                description: 'Локальный сервер',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                }
            }
        }
    },
    apis: ['./app.js'],
};

const specs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
console.log(`Swagger UI доступен по адресу http://localhost:${port}/api-docs`);

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Регистрация нового пользователя (доступно гостям)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - first_name
 *               - last_name
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               first_name:
 *                 type: string
 *               last_name:
 *                 type: string
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       201:
 *         description: Пользователь успешно создан
 */
app.post('/api/auth/register', async (req, res) => {
    const { email, first_name, last_name, password } = req.body;

    if (!email || !first_name || !last_name || !password) {
        return res.status(400).json({ error: 'Все поля обязательны' });
    }

    const existingUser = users.find(user => user.email === email);
    if (existingUser) {
        return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
    }

    try {
        const hashedPassword = await hashPassword(password);

        const newUser = {
            id: nanoid(),
            email: email,
            first_name: first_name,
            last_name: last_name,
            password: hashedPassword,
            role: 'user',
            isBlocked: false
        };

        users.push(newUser);

        const userForResponse = { ...newUser };
        delete userForResponse.password;
        res.status(201).json(userForResponse);

    } catch (error) {
        console.error('Ошибка при регистрации:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Авторизация пользователя (доступно гостям)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Успешная авторизация
 */
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email и пароль обязательны' });
    }

    const user = users.find(u => u.email === email);
    if (!user) {
        return res.status(401).json({ error: 'Неверные учетные данные' });
    }

    if (user.isBlocked) {
        return res.status(403).json({ error: 'Пользователь заблокирован' });
    }

    try {
        const isPasswordCorrect = await verifyPassword(password, user.password);

        if (isPasswordCorrect) {
            const accessToken = generateAccessToken(user);
            const refreshToken = generateRefreshToken(user);

            refreshTokens.add(refreshToken);

            res.status(200).json({
                accessToken,
                refreshToken,
                user: {
                    id: user.id,
                    email: user.email,
                    first_name: user.first_name,
                    last_name: user.last_name,
                    role: user.role
                }
            });
        } else {
            res.status(401).json({ error: 'Неверные учетные данные' });
        }
    } catch (error) {
        console.error('Ошибка при авторизации:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Обновление пары токенов (доступно гостям)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Успешное обновление токенов
 */
app.post('/api/auth/refresh', (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return res.status(400).json({
            error: "refreshToken is required"
        });
    }

    if (!refreshTokens.has(refreshToken)) {
        return res.status(401).json({
            error: "Invalid refresh token"
        });
    }

    try {
        const payload = jwt.verify(refreshToken, REFRESH_SECRET);

        const user = users.find((u) => u.id === payload.sub);
        if (!user) {
            return res.status(401).json({
                error: "User not found"
            });
        }

        if (user.isBlocked) {
            return res.status(403).json({ error: 'User is blocked' });
        }

        refreshTokens.delete(refreshToken);

        const newAccessToken = generateAccessToken(user);
        const newRefreshToken = generateRefreshToken(user);

        refreshTokens.add(newRefreshToken);

        res.json({
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
        });

    } catch (err) {
        return res.status(401).json({
            error: "Invalid or expired refresh token"
        });
    }
});

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Получить данные текущего пользователя (доступно пользователям, продавцам, админам)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Данные пользователя
 */
app.get('/api/auth/me', authMiddleware, (req, res) => {
    const userId = req.user.sub;
    const user = users.find(u => u.id === userId);

    if (!user) {
        return res.status(404).json({ error: 'Пользователь не найден' });
    }

    if (user.isBlocked) {
        return res.status(403).json({ error: 'User is blocked' });
    }

    res.json({
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role
    });
});

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Получить список всех пользователей (только для админа)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Список пользователей
 */
app.get('/api/users', authMiddleware, roleMiddleware(['admin']), (req, res) => {
    const usersWithoutPasswords = users.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
    });
    res.json(usersWithoutPasswords);
});

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Получить пользователя по ID (только для админа)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Данные пользователя
 */
app.get('/api/users/:id', authMiddleware, roleMiddleware(['admin']), (req, res) => {
    const userId = req.params.id;
    const user = users.find(u => u.id === userId);

    if (!user) {
        return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
});

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Обновить информацию пользователя (только для админа)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               first_name:
 *                 type: string
 *               last_name:
 *                 type: string
 *               email:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [user, seller, admin]
 *     responses:
 *       200:
 *         description: Пользователь обновлен
 */
app.put('/api/users/:id', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
    const userId = req.params.id;
    const { first_name, last_name, email, role } = req.body;

    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1) {
        return res.status(404).json({ error: 'Пользователь не найден' });
    }

    if (email && email !== users[userIndex].email) {
        const existingUser = users.find(u => u.email === email && u.id !== userId);
        if (existingUser) {
            return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
        }
    }

    users[userIndex] = {
        ...users[userIndex],
        first_name: first_name || users[userIndex].first_name,
        last_name: last_name || users[userIndex].last_name,
        email: email || users[userIndex].email,
        role: role || users[userIndex].role
    };

    const { password, ...userWithoutPassword } = users[userIndex];
    res.json(userWithoutPassword);
});

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Заблокировать пользователя (только для админа)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Пользователь заблокирован
 */
app.delete('/api/users/:id', authMiddleware, roleMiddleware(['admin']), (req, res) => {
    const userId = req.params.id;

    // Нельзя заблокировать самого себя
    if (userId === req.user.sub) {
        return res.status(400).json({ error: 'Нельзя заблокировать самого себя' });
    }

    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1) {
        return res.status(404).json({ error: 'Пользователь не найден' });
    }

    users[userIndex].isBlocked = true;
    res.json({ message: 'Пользователь заблокирован' });
});

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Создать новый товар (только для продавца и админа)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - category
 *               - description
 *               - price
 *             properties:
 *               title:
 *                 type: string
 *               category:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *     responses:
 *       201:
 *         description: Товар успешно создан
 */
app.post('/api/products', authMiddleware, roleMiddleware(['seller', 'admin']), (req, res) => {
    const { title, category, description, price, image } = req.body;

    if (!title || !category || !description || price === undefined) {
        return res.status(400).json({ error: 'Все поля обязательны' });
    }
    if (typeof price !== 'number' || price < 0) {
        return res.status(400).json({ error: 'Поле price должно быть неотрицательным числом' });
    }

    const newProduct = {
        id: nanoid(),
        title,
        category,
        description,
        price,
        image: image || 'https://avatars.mds.yandex.net/get-mpic/11722550/2a0000019aa32d8e2d8b53732afd2b09c2fe/orig',
        createdBy: req.user.sub,
        createdAt: new Date().toISOString()
    };

    products.push(newProduct);
    res.status(201).json(newProduct);
});

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Получить список всех товаров (доступно всем авторизованным пользователям)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Список товаров
 */
app.get('/api/products', authMiddleware, roleMiddleware(['user', 'seller', 'admin']), (req, res) => {
    res.status(200).json(products);
});

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Получить товар по ID (доступно всем авторизованным пользователям)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Товар найден
 */
app.get('/api/products/:id', authMiddleware, roleMiddleware(['user', 'seller', 'admin']), (req, res) => {
    const productId = req.params.id;
    const product = products.find(p => p.id === productId);

    if (!product) {
        return res.status(404).json({ error: 'Товар не найден' });
    }

    res.status(200).json(product);
});

/**
 * @swagger
 * /api/products/{id}:
 *   put:
 *     summary: Обновить товар по ID (только для продавца и админа)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               category:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *     responses:
 *       200:
 *         description: Товар обновлен
 */
app.put('/api/products/:id', authMiddleware, roleMiddleware(['seller', 'admin']), (req, res) => {
    const productId = req.params.id;
    const { title, category, description, price, image } = req.body;

    const productIndex = products.findIndex(p => p.id === productId);

    if (productIndex === -1) {
        return res.status(404).json({ error: 'Товар не найден' });
    }

    const updatedProduct = {
        ...products[productIndex],
        title: title || products[productIndex].title,
        category: category || products[productIndex].category,
        description: description || products[productIndex].description,
        price: price !== undefined ? price : products[productIndex].price,
        image: image || products[productIndex].image,
        updatedAt: new Date().toISOString()
    };

    if (price !== undefined && (typeof price !== 'number' || price < 0)) {
        return res.status(400).json({ error: 'Поле price должно быть неотрицательным числом' });
    }

    products[productIndex] = updatedProduct;
    res.status(200).json(updatedProduct);
});

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: Удалить товар по ID (только для админа)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Товар успешно удален
 */
app.delete('/api/products/:id', authMiddleware, roleMiddleware(['admin']), (req, res) => {
    const productId = req.params.id;
    const productIndex = products.findIndex(p => p.id === productId);

    if (productIndex === -1) {
        return res.status(404).json({ error: 'Товар не найден' });
    }

    products.splice(productIndex, 1);
    res.status(200).json({ message: 'Товар успешно удален' });
});

app.listen(port, () => {
    console.log(`Сервер запущен на http://localhost:${port}`);
});