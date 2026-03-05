const express = require('express');
const { nanoid } = require('nanoid');
const cors = require('cors');

const app = express();
const port = 3000;

let products = [
    { id: nanoid(6), name: 'Сок "Добрый" Апельсиновый', category: 'Соки', description: 'Апельсиновый сок, 1л', price: 1.99, stock: 45, rating: 4.8, image: 'https://tsx.x5static.net/i/800x800-fit/xdelivery/files/28/ff/95a6972c342cb3537a3084b798ea.jpg' },
    { id: nanoid(6), name: 'Сок "Добрый" Яблочный', category: 'Соки', description: 'Яблочный сок, 1л', price: 1.79, stock: 50, rating: 4.7, image: 'https://tsx.x5static.net/i/800x800-fit/xdelivery/files/3e/69/5703ec8f0386d50d72b4cc91031b.jpg' },
    { id: nanoid(6), name: 'Сок "Добрый" Вишневый', category: 'Соки', description: 'Вишневый сок, 1л', price: 2.29, stock: 30, rating: 4.9, image: 'https://halar.ru/wp-content/uploads/vishnevyj-1-1000x1000.png' },
    { id: nanoid(6), name: 'Сок "Добрый" Мультифрукт', category: 'Соки', description: 'Мультифруктовый сок, 1л', price: 2.19, stock: 35, rating: 4.8, image: 'https://halar.ru/wp-content/uploads/multifrukt.png' },
    { id: nanoid(6), name: 'Сок "Добрый" Томатный', category: 'Соки', description: 'Томатный сок, 1л', price: 1.89, stock: 25, rating: 4.5, image: 'https://tsx.x5static.net/i/800x800-fit/xdelivery/files/27/03/0a86ee094f7d35b0d6021bc3fb10.jpg' },
    { id: nanoid(6), name: 'Сок "Добрый" Персиковый', category: 'Соки', description: 'Персиковый сок, 1л', price: 2.39, stock: 20, rating: 4.8, image: 'https://tsx.x5static.net/i/800x800-fit/xdelivery/files/7c/3d/fd71ccbeff1e221da669344460fc.jpg' },
    { id: nanoid(6), name: 'Сок "Добрый" Виноградный', category: 'Соки', description: 'Виноградный сок, 1л', price: 2.09, stock: 28, rating: 4.7, image: 'https://tsx.x5static.net/i/800x800-fit/xdelivery/files/35/a7/b401b40d2a7b20817abf2ed5aab8.jpg' },
    { id: nanoid(6), name: 'Сок "Добрый" Ананасовый', category: 'Соки', description: 'Ананасовый сок, 1л', price: 2.49, stock: 15, rating: 4.8, image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT1Jdm5CbCoWdekI1KVk_qBYhx8xXndFkRvyA&s' },
    { id: nanoid(6), name: 'Нектар "Добрый" Банановый микс', category: 'Нектары', description: 'Банановый нектар, 1л', price: 2.19, stock: 18, rating: 4.6, image: 'https://tsx.x5static.net/i/800x800-fit/xdelivery/files/81/1f/8aa6eb2c0a8ede49973a70c04139.jpg' },
    { id: nanoid(6), name: 'Морс "Добрый" Клюквенный', category: 'Морсы', description: 'Клюквенный морс, 1л', price: 2.29, stock: 22, rating: 4.9, image: 'https://tsx.x5static.net/i/800x800-fit/xdelivery/files/10/e5/75ed80ebe61caa75d9a29c6726fd.jpg' }
];
// Middleware
app.use(express.json());
app.use(cors({ origin: "http://localhost:3001" }));

// Логирование (как в методичке)
app.use((req, res, next) => {
    res.on('finish', () => {
        console.log(`[${new Date().toISOString()}] [${req.method}] ${res.statusCode} ${req.path}`);
        if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
            console.log('Body:', req.body);
        }
    });
    next();
});

// Функция-помощник (как в методичке)
function findProductOr404(id, res) {
    const product = products.find(p => p.id === id);
    if (!product) {
        res.status(404).json({ error: "Product not found" });
        return null;
    }
    return product;
}

// CRUD операции (как в методичке)
app.get("/api/products", (req, res) => {
    res.json(products);
});

app.get("/api/products/:id", (req, res) => {
    const id = req.params.id;
    const product = findProductOr404(id, res);
    if (!product) return;
    res.json(product);
});

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
        image: image?.trim() || 'https://via.placeholder.com/200x150'
    };

    products.push(newProduct);
    res.status(201).json(newProduct);
});

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

app.delete("/api/products/:id", (req, res) => {
    const id = req.params.id;
    const exists = products.some(p => p.id === id);
    if (!exists) return res.status(404).json({ error: "Product not found" });

    products = products.filter(p => p.id !== id);
    res.status(204).send();
});

// 404 и обработка ошибок (как в методичке)
app.use((req, res) => {
    res.status(404).json({ error: "Not found" });
});

app.use((err, req, res, next) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
});

app.listen(port, () => {
    console.log(`Сервер запущен на http://localhost:${port}`);
});