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

const reminders = new Map();

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

    socket.on('newReminder', (reminder) => {
        const { id, text, reminderTime } = reminder;
        const delay = reminderTime - Date.now();

        if (delay <= 0) {
            console.log('⚠️ Время напоминания уже прошло:', id);
            return;
        }

        console.log(`⏰ Запланировано напоминание "${text}" через ${Math.round(delay / 1000)} секунд (id: ${id})`);

        const timeoutId = setTimeout(() => {
            console.log(`🔔 Отправка напоминания для заметки ${id}: "${text}"`);

            const payload = JSON.stringify({
                title: '!!! Напоминание',
                body: text,
                reminderId: id
            });

            subscriptions.forEach(sub => {
                webpush.sendNotification(sub, payload).catch(err => {
                    console.error('❌ Ошибка push:', err);
                    if (err.statusCode === 410) {
                        subscriptions = subscriptions.filter(s => s.endpoint !== sub.endpoint);
                    }
                });
            });

            reminders.delete(id);
        }, delay);

        reminders.set(id, {
            timeoutId,
            text,
            reminderTime
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

app.post('/snooze', (req, res) => {
    const reminderId = parseInt(req.query.reminderId, 10);

    if (!reminderId || !reminders.has(reminderId)) {
        return res.status(400).json({ error: 'Reminder not found' });
    }

    const reminder = reminders.get(reminderId);

    clearTimeout(reminder.timeoutId);

    const newDelay = 5 * 60 * 1000;
    const newTimeoutId = setTimeout(() => {
        console.log(`🔔 Отправка отложенного напоминания для заметки ${reminderId}: "${reminder.text}"`);

        const payload = JSON.stringify({
            title: 'Напоминание отложено',
            body: reminder.text,
            reminderId: reminderId
        });

        subscriptions.forEach(sub => {
            webpush.sendNotification(sub, payload).catch(err => {
                console.error('❌ Ошибка push:', err);
                if (err.statusCode === 410) {
                    subscriptions = subscriptions.filter(s => s.endpoint !== sub.endpoint);
                }
            });
        });

        reminders.delete(reminderId);
    }, newDelay);

    reminders.set(reminderId, {
        timeoutId: newTimeoutId,
        text: reminder.text,
        reminderTime: Date.now() + newDelay
    });

    console.log(`⏰ Напоминание ${reminderId} отложено на 5 минут`);
    res.status(200).json({ message: 'Reminder snoozed for 5 minutes' });
});

const PORT = 3001;
server.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на http://localhost:${PORT}`);
    console.log(`🔑 Публичный VAPID-ключ: ${vapidKeys.publicKey.substring(0, 30)}...`);
});