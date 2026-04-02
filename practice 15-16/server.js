const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const webpush = require('web-push');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const vapidKeys = {
    publicKey: 'BOzLqHYbBqcQ2fgH0r9Fv4ZRGfgSeDRhggwHERxVqLYbBOhB6nsaK06bthNT5-PiLujmXG-O4xR_Yr6AYsEiF3g',
    privateKey: 'aSl2pOoPgmWmsDebvLO84P02FhwQD-01wOEoS4SVbSg'
};

webpush.setVapidDetails(
    'mailto:your-email@example.com',
    vapidKeys.publicKey,
    vapidKeys.privateKey
);

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, './')));

let subscriptions = [];

const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

io.on('connection', (socket) => {
    console.log('✅ Клиент подключён:', socket.id);

    socket.on('newTask', (task) => {
        console.log('📝 Новая задача от клиента:', task);
        io.emit('taskAdded', task);

        const payload = JSON.stringify({
            title: '📝 Новая заметка!',
            body: task.text,
            icon: '/icons/favicon-128x128.png',
            badge: '/icons/favicon-48x48.png'
        });

        subscriptions.forEach(sub => {
            webpush.sendNotification(sub, payload).catch(err => {
                console.error('❌ Ошибка push:', err);
                if (err.statusCode === 410) {
                    subscriptions = subscriptions.filter(s => s.endpoint !== sub.endpoint);
                }
            });
        });
    });

    socket.on('disconnect', () => {
        console.log('❌ Клиент отключён:', socket.id);
    });
});

app.post('/subscribe', (req, res) => {
    const subscription = req.body;
    const exists = subscriptions.some(sub => sub.endpoint === subscription.endpoint);
    if (!exists) {
        subscriptions.push(subscription);
        console.log('✅ Подписка сохранена. Всего подписок:', subscriptions.length);
    }
    res.status(201).json({ message: 'Подписка сохранена' });
});

app.post('/unsubscribe', (req, res) => {
    const { endpoint } = req.body;
    subscriptions = subscriptions.filter(sub => sub.endpoint !== endpoint);
    console.log('❌ Подписка удалена. Осталось подписок:', subscriptions.length);
    res.status(200).json({ message: 'Подписка удалена' });
});

const PORT = 3001;
server.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на http://localhost:${PORT}`);
    console.log(`🔑 Публичный VAPID-ключ: ${vapidKeys.publicKey.substring(0, 30)}...`);
});