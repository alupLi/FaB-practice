const express = require('express');
const cors = require('cors');
const { nanoid } = require('nanoid');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { createClient } = require('redis');

const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const app = express();
const port = 3000;

const redisClient = createClient({
    url: 'redis://localhost:6379'
});

redisClient.on('error', (err) => console.error('Redis Client Error:', err));
redisClient.on('connect', () => console.log('✅ Redis connected'));

const USERS_CACHE_TTL = 60;
const PRODUCTS_CACHE_TTL = 600;

async function saveToCache(key, data, ttl) {
    try {
        await redisClient.set(key, JSON.stringify(data), { EX: ttl });
        console.log(`📦 Cached: ${key} (TTL: ${ttl}s)`);
    } catch (err) {
        console.error('Cache save error:', err);
    }
}

function cacheMiddleware(keyBuilder, ttl) {
    return async (req, res, next) => {
        try {
            const key = keyBuilder(req);
            const cachedData = await redisClient.get(key);
            if (cachedData) {
                console.log(`⚡ Cache HIT: ${key}`);
                return res.json({
                    source: "cache",
                    data: JSON.parse(cachedData)
                });
            }
            console.log(`💾 Cache MISS: ${key}`);
            req.cacheKey = key;
            req.cacheTTL = ttl;
            next();
        } catch (err) {
            console.error("Cache read error:", err);
            next();
        }
    };
}

async function invalidateUsersCache(userId = null) {
    try {
        await redisClient.del('users:all');
        if (userId) {
            await redisClient.del(`users:${userId}`);
        }
        console.log('🗑️ Users cache invalidated');
    } catch (err) {
        console.error("Users cache invalidate error:", err);
    }
}

async function invalidateProductsCache(productId = null) {
    try {
        await redisClient.del('products:all');
        if (productId) {
            await redisClient.del(`products:${productId}`);
        }
        console.log('🗑️ Products cache invalidated');
    } catch (err) {
        console.error("Products cache invalidate error:", err);
    }
}

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
            description: 'API с системой ролей (RBAC) и кэшированием Redis',
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

app.post('/api/auth/refresh', (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return res.status(400).json({ error: "refreshToken is required" });
    }

    if (!refreshTokens.has(refreshToken)) {
        return res.status(401).json({ error: "Invalid refresh token" });
    }

    try {
        const payload = jwt.verify(refreshToken, REFRESH_SECRET);

        const user = users.find((u) => u.id === payload.sub);
        if (!user) {
            return res.status(401).json({ error: "User not found" });
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
        return res.status(401).json({ error: "Invalid or expired refresh token" });
    }
});

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

app.get('/api/users',
    authMiddleware,
    roleMiddleware(['admin']),
    cacheMiddleware(() => 'users:all', USERS_CACHE_TTL),
    async (req, res) => {
        const usersWithoutPasswords = users.map(user => {
            const { password, ...userWithoutPassword } = user;
            return userWithoutPassword;
        });
        await saveToCache(req.cacheKey, usersWithoutPasswords, req.cacheTTL);
        res.json({
            source: "server",
            data: usersWithoutPasswords
        });
    }
);

app.get('/api/users/:id',
    authMiddleware,
    roleMiddleware(['admin']),
    cacheMiddleware((req) => `users:${req.params.id}`, USERS_CACHE_TTL),
    async (req, res) => {
        const userId = req.params.id;
        const user = users.find(u => u.id === userId);

        if (!user) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        const { password, ...userWithoutPassword } = user;
        await saveToCache(req.cacheKey, userWithoutPassword, req.cacheTTL);
        res.json({
            source: "server",
            data: userWithoutPassword
        });
    }
);

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

    await invalidateUsersCache(userId);

    const { password, ...userWithoutPassword } = users[userIndex];
    res.json(userWithoutPassword);
});

app.delete('/api/users/:id', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
    const userId = req.params.id;

    if (userId === req.user.sub) {
        return res.status(400).json({ error: 'Нельзя заблокировать самого себя' });
    }

    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1) {
        return res.status(404).json({ error: 'Пользователь не найден' });
    }

    users[userIndex].isBlocked = true;

    await invalidateUsersCache(userId);

    res.json({ message: 'Пользователь заблокирован' });
});

app.post('/api/products', authMiddleware, roleMiddleware(['seller', 'admin']), async (req, res) => {
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

    await invalidateProductsCache();

    res.status(201).json(newProduct);
});

app.get('/api/products',
    authMiddleware,
    roleMiddleware(['user', 'seller', 'admin']),
    cacheMiddleware(() => 'products:all', PRODUCTS_CACHE_TTL),
    async (req, res) => {
        await saveToCache(req.cacheKey, products, req.cacheTTL);
        res.json({
            source: "server",
            data: products
        });
    }
);

app.get('/api/products/:id',
    authMiddleware,
    roleMiddleware(['user', 'seller', 'admin']),
    cacheMiddleware((req) => `products:${req.params.id}`, PRODUCTS_CACHE_TTL),
    async (req, res) => {
        const productId = req.params.id;
        const product = products.find(p => p.id === productId);

        if (!product) {
            return res.status(404).json({ error: 'Товар не найден' });
        }

        await saveToCache(req.cacheKey, product, req.cacheTTL);
        res.json({
            source: "server",
            data: product
        });
    }
);

app.put('/api/products/:id', authMiddleware, roleMiddleware(['seller', 'admin']), async (req, res) => {
    const productId = req.params.id;
    const { title, category, description, price, image } = req.body;

    const productIndex = products.findIndex(p => p.id === productId);

    if (productIndex === -1) {
        return res.status(404).json({ error: 'Товар не найден' });
    }

    if (price !== undefined && (typeof price !== 'number' || price < 0)) {
        return res.status(400).json({ error: 'Поле price должно быть неотрицательным числом' });
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

    products[productIndex] = updatedProduct;

    await invalidateProductsCache(productId);

    res.status(200).json(updatedProduct);
});

app.delete('/api/products/:id', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
    const productId = req.params.id;
    const productIndex = products.findIndex(p => p.id === productId);

    if (productIndex === -1) {
        return res.status(404).json({ error: 'Товар не найден' });
    }

    products.splice(productIndex, 1);

    await invalidateProductsCache(productId);

    res.status(200).json({ message: 'Товар успешно удален' });
});

async function startServer() {
    try {
        await redisClient.connect();
        app.listen(port, () => {
            console.log(`🚀 Сервер запущен на http://localhost:${port}`);
            console.log(`📚 Swagger UI: http://localhost:${port}/api-docs`);
        });
    } catch (err) {
        console.error('❌ Failed to connect to Redis:', err);
        process.exit(1);
    }
}

startServer();