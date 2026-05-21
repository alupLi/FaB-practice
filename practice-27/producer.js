import express from 'express';
import amqplib from 'amqplib';
import { RABBITMQ_URL, QUEUE_NAME, PORT } from './config.js';

const app = express();
app.use(express.json());

let connection = null;
let channel = null;

// Подключение к RabbitMQ
async function connectRabbitMQ() {
    try {
        connection = await amqplib.connect(RABBITMQ_URL);
        channel = await connection.createChannel();
    
        // Проверяем существование очереди (НЕ создаём)
        try {
            await channel.checkQueue(QUEUE_NAME);
            console.log('✓ Producer подключён к RabbitMQ');
        } catch (error) {
            if (error.code === 404) {
                console.error('✗ Очередь не существует! Запустите: npm run setup');
                process.exit(1);
            }
            throw error;
        }
    } catch (error) {
        console.error('Ошибка подключения к RabbitMQ:', error.message);
        setTimeout(connectRabbitMQ, 5000);
    }
}

// Эндпоинт для создания задачи
app.post('/tasks', async (req, res) => {
    try {
        const { type, payload } = req.body;
    
        if (!type || !payload) {
            return res.status(400).json({ 
                error: 'Необходимо указать type и payload' 
            });
        }

        const task = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type,
            payload,
            createdAt: new Date().toISOString()
        };

        // Отправляем сообщение в очередь
        const sent = channel.sendToQueue(
            QUEUE_NAME,
            Buffer.from(JSON.stringify(task)),
            { 
                persistent: true
            }
        );

        if (sent) {
            console.log(`[Producer] Задача ${task.id} добавлена в очередь`);
        } else {
            console.log(`[Producer] Очередь переполнена, задача ${task.id} не добавлена`);
        }
    
        res.status(201).json({
            message: 'Задача добавлена в очередь',
            taskId: task.id,
            task
        });
    } catch (error) {
        console.error('[Producer] Ошибка:', error.message);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

// Эндпоинт для получения статистики
app.get('/tasks/stats', async (req, res) => {
    res.json({
        status: 'running',
        queue: QUEUE_NAME,
        message: 'Используйте RabbitMQ Management UI для детальной статистики: http://localhost:15672'
    });
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`✓ Producer API запущен на http://localhost:${PORT}`);
    console.log(`  - POST /tasks - добавить задачу`);
    console.log(`  - GET /tasks/stats - статистика`);
});

connectRabbitMQ();

// Обработка закрытия
process.on('SIGINT', async () => {
    console.log('\nЗавершение работы...');
    if (channel) await channel.close();
    if (connection) await connection.close();
    process.exit(0);
});