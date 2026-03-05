const express = require('express');
const { nanoid } = require('nanoid');
const cors = require('cors');

const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const app = express();
const port = 3000;

const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'API магазина соков "Добрый"',
            version: '1.0.0',
            description: 'API для управления товарами интернет-магазина соков "Добрый"',
        },
        servers: [
            {
                url: `http://localhost:${port}`,
                description: 'Локальный сервер',
            },
        ],
    },
    apis: ['./app.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/**
 * @swagger
 * components:
 *   schemas:
 *     Product:
 *       type: object
 *       required:
 *         - name
 *         - category
 *         - price
 *         - stock
 *       properties:
 *         id:
 *           type: string
 *           description: Уникальный ID товара
 *         name:
 *           type: string
 *           description: Название сока
 *         category:
 *           type: string
 *           description: Категория (Соки, Нектары, Морсы)
 *         description:
 *           type: string
 *           description: Описание товара
 *         price:
 *           type: number
 *           description: Цена в $
 *         stock:
 *           type: integer
 *           description: Количество на складе
 *         rating:
 *           type: number
 *           description: Рейтинг (0-5)
 *         image:
 *           type: string
 *           description: URL изображения
 *       example:
 *         id: "abc123"
 *         name: "Сок Добрый Апельсиновый"
 *         category: "Соки"
 *         description: "Апельсиновый сок, 1л"
 *         price: 1.99
 *         stock: 45
 *         rating: 4.8
 *         image: "https://example.com/juice.jpg"
 */

let products = [
    { id: nanoid(6), name: 'Сок "Добрый" Апельсиновый', category: 'Соки', description: 'Апельсиновый сок, 1л', price: 1.99, stock: 45, rating: 5, image: 'https://tsx.x5static.net/i/800x800-fit/xdelivery/files/28/ff/95a6972c342cb3537a3084b798ea.jpg' },
    { id: nanoid(6), name: 'Сок "Добрый" Яблочный', category: 'Соки', description: 'Яблочный сок, 1л', price: 1.79, stock: 50, rating: 4.9, image: 'https://tsx.x5static.net/i/800x800-fit/xdelivery/files/3e/69/5703ec8f0386d50d72b4cc91031b.jpg' },
    { id: nanoid(6), name: 'Сок "Добрый" Вишневый', category: 'Соки', description: 'Вишневый сок, 1л', price: 2.29, stock: 30, rating: 4.4, image: 'https://halar.ru/wp-content/uploads/vishnevyj-1-1000x1000.png' },
    { id: nanoid(6), name: 'Сок "Добрый" Мультифрукт', category: 'Соки', description: 'Мультифруктовый сок, 1л', price: 2.19, stock: 35, rating: 4.8, image: 'https://halar.ru/wp-content/uploads/multifrukt.png' },
    { id: nanoid(6), name: 'Сок "Добрый" Томатный', category: 'Соки', description: 'Томатный сок, 1л', price: 1.89, stock: 25, rating: 4.2, image: 'https://tsx.x5static.net/i/800x800-fit/xdelivery/files/27/03/0a86ee094f7d35b0d6021bc3fb10.jpg' },
    { id: nanoid(6), name: 'Сок "Добрый" Персиковый', category: 'Соки', description: 'Персиковый сок, 1л', price: 2.39, stock: 20, rating: 4.8, image: 'https://tsx.x5static.net/i/800x800-fit/xdelivery/files/7c/3d/fd71ccbeff1e221da669344460fc.jpg' },
    { id: nanoid(6), name: 'Сок "Добрый" Виноградный', category: 'Соки', description: 'Виноградный сок, 1л', price: 2.09, stock: 28, rating: 4.4, image: 'https://tsx.x5static.net/i/800x800-fit/xdelivery/files/35/a7/b401b40d2a7b20817abf2ed5aab8.jpg' },
    { id: nanoid(6), name: 'Сок "Добрый" Ананасовый', category: 'Соки', description: 'Ананасовый сок, 1л', price: 2.49, stock: 15, rating: 4.6, image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT1Jdm5CbCoWdekI1KVk_qBYhx8xXndFkRvyA&s' },
    { id: nanoid(6), name: 'Нектар "Добрый" Банановый микс', category: 'Нектары', description: 'Банановый нектар, 1л', price: 2.19, stock: 18, rating: 4.8, image: 'https://tsx.x5static.net/i/800x800-fit/xdelivery/files/81/1f/8aa6eb2c0a8ede49973a70c04139.jpg' },
    { id: nanoid(6), name: 'Морс "Добрый" Клюквенный', category: 'Морсы', description: 'Клюквенный морс, 1л', price: 2.29, stock: 22, rating: 4.9, image: 'https://tsx.x5static.net/i/800x800-fit/xdelivery/files/10/e5/75ed80ebe61caa75d9a29c6726fd.jpg' }
];

// Middleware
app.use(express.json());
app.use(cors({ origin: "http://localhost:3001" }));

// Логирование
app.use((req, res, next) => {
    res.on('finish', () => {
        console.log(`[${new Date().toISOString()}] [${req.method}] ${res.statusCode} ${req.path}`);
        if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
            console.log('Body:', req.body);
        }
    });
    next();
});

function findProductOr404(id, res) {
    const product = products.find(p => p.id === id);
    if (!product) {
        res.status(404).json({ error: "Product not found" });
        return null;
    }
    return product;
}

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Возвращает список всех соков
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: Список товаров
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Product'
 */
app.get("/api/products", (req, res) => {
    res.json(products);
});

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Получает товар по ID
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID товара
 *     responses:
 *       200:
 *         description: Данные товара
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       404:
 *         description: Товар не найден
 */
app.get("/api/products/:id", (req, res) => {
    const id = req.params.id;
    const product = findProductOr404(id, res);
    if (!product) return;
    res.json(product);
});

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Создает новый товар (сок)
 *     tags: [Products]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - category
 *               - price
 *               - stock
 *             properties:
 *               name:
 *                 type: string
 *                 description: Название сока
 *               category:
 *                 type: string
 *                 description: Категория
 *               description:
 *                 type: string
 *                 description: Описание
 *               price:
 *                 type: number
 *                 description: Цена
 *               stock:
 *                 type: integer
 *                 description: Количество на складе
 *               rating:
 *                 type: number
 *                 description: Рейтинг (0-5)
 *               image:
 *                 type: string
 *                 description: URL изображения
 *     responses:
 *       201:
 *         description: Товар создан
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       400:
 *         description: Ошибка в данных
 */
app.post("/api/products", (req, res) => {
    const { name, category, description, price, stock, rating, image } = req.body;

    if (!name?.trim() || !category?.trim() || !description?.trim()) {
        return res.status(400).json({ error: "Name, category and description are required" });
    }

    const newProduct = {
        id: nanoid(6),
        name: name.trim(),
        category: category.trim(),
        description: description.trim(),
        price: Number(price) || 0,
        stock: Number(stock) || 0,
        rating: Number(rating) || 0,
        image: image?.trim() || 'https://cleanshop.ru/i/no_image.gif'
    };

    products.push(newProduct);
    res.status(201).json(newProduct);
});

/**
 * @swagger
 * /api/products/{id}:
 *   patch:
 *     summary: Обновляет данные товара
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID товара
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               category:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               stock:
 *                 type: integer
 *               rating:
 *                 type: number
 *               image:
 *                 type: string
 *     responses:
 *       200:
 *         description: Обновленный товар
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       400:
 *         description: Нет данных для обновления
 *       404:
 *         description: Товар не найден
 */
app.patch("/api/products/:id", (req, res) => {
    const id = req.params.id;
    const product = findProductOr404(id, res);
    if (!product) return;

    const { name, category, description, price, stock, rating, image } = req.body;

    if (name !== undefined) product.name = name.trim();
    if (category !== undefined) product.category = category.trim();
    if (description !== undefined) product.description = description.trim();
    if (price !== undefined) product.price = Number(price);
    if (stock !== undefined) product.stock = Number(stock);
    if (rating !== undefined) product.rating = Number(rating);
    if (image !== undefined) product.image = image.trim();

    res.json(product);
});

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: Удаляет товар
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID товара
 *     responses:
 *       204:
 *         description: Товар успешно удален (нет тела ответа)
 *       404:
 *         description: Товар не найден
 */
app.delete("/api/products/:id", (req, res) => {
    const id = req.params.id;
    const exists = products.some(p => p.id === id);
    if (!exists) return res.status(404).json({ error: "Product not found" });

    products = products.filter(p => p.id !== id);
    res.status(204).send();
});

app.use((req, res) => {
    res.status(404).json({ error: "Not found" });
});

app.use((err, req, res, next) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
});

app.listen(port, () => {
    console.log(`Сервер запущен на http://localhost:${port}`);
    console.log(`Swagger документация: http://localhost:${port}/api-docs`);
});