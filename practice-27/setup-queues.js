import amqplib from 'amqplib';
import { RABBITMQ_URL, QUEUE_NAME, DEAD_LETTER_QUEUE, DEAD_LETTER_EXCHANGE } from './config.js';

async function setupQueues() {
    try {
        const connection = await amqplib.connect(RABBITMQ_URL);
        const channel = await connection.createChannel();

        // 1. Создаём Dead Letter Exchange
        await channel.assertExchange(DEAD_LETTER_EXCHANGE, 'direct', { durable: true });

        // 2. Создаём Dead Letter Queue
        await channel.assertQueue(DEAD_LETTER_QUEUE, { durable: true });

        // 3. Привязываем DLQ к DLX
        await channel.bindQueue(DEAD_LETTER_QUEUE, DEAD_LETTER_EXCHANGE, 'dead');

        // 4. Создаём основную очередь с указанием DLX
        await channel.assertQueue(QUEUE_NAME, {
            durable: true,
            arguments: {
                'x-dead-letter-exchange': DEAD_LETTER_EXCHANGE,
                'x-dead-letter-routing-key': 'dead',
                'x-message-ttl': 60000 // Сообщение живёт 60 секунд
            }
        });

        console.log('✓ Очереди настроены:');
        console.log(`  - ${QUEUE_NAME} → [DLX] → ${DEAD_LETTER_QUEUE}`);
    
        await channel.close();
        await connection.close();
    } catch (error) {
        console.error('Ошибка настройки очередей:', error.message);
        process.exit(1);
    }
}

setupQueues();