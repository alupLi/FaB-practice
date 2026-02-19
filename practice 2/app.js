const express = require('express');
const app = express();
const port = 3000;

// Начальные данные - список товаров
let goods = [
    { id: 1, name: 'Товар 1', price: 100 },
    { id: 2, name: 'Товар 2', price: 200 },
    { id: 3, name: 'Товар 3', price: 300 }
];

// Middleware для парсинга JSON
app.use(express.json());

// Главная страница
app.get('/', (req, res) => {
    res.send(`
        <h1>Управление товарами</h1>
        <ul>
            <li>/goods - все товары</li>
            <li>/goods/:id - товар по id</li>
            <li>/goods - добавить товар (name, price в JSON)</li>
            <li>/goods/:id - изменить товар</li>
            <li>/goods/:id - удалить товар</li>
        </ul>
    `);
});

// 1 Получить все товары
app.get('/goods', (req, res) => {
    res.json(goods);
});

// 2 Получить товар по id
app.get('/goods/:id', (req, res) => {
    const good = goods.find(item => item.id == req.params.id);

    // Если такого товара нет
    if (!good) {
        return res.status(404).json({ message: 'Товар не найден' });
    }

    res.json(good);
});

// 3 Добавить товар
app.post('/goods', (req, res) => {
    const { name, price } = req.body;

    const newGood = {
        id: Date.now(),
        name: name,
        price: price
    };

    goods.push(newGood);
    res.status(201).json(newGood);
});

// 4 Изменить товар
app.patch('/goods/:id', (req, res) => {
    const good = goods.find(item => item.id == req.params.id);

    // Если такого товара нет
    if (!good) {
        return res.status(404).json({ message: 'Товар не найден' });
    }

    const { name, price } = req.body;

    if (name !== undefined) good.name = name;
    if (price !== undefined) good.price = price;

    res.json(good);
});

// 5 Уддалить товар
app.delete('/goods/:id', (req, res) => {
    goods = goods.filter(item => item.id != req.params.id);
    res.send('Товар удален');
});

// Запуск сервера
app.listen(port, () => {
    console.log(`Сервер запущен на http://localhost:${port}`);
});