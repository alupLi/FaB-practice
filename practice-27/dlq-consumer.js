import amqplib from 'amqplib';
import { RABBITMQ_URL, DEAD_LETTER_QUEUE } from './config.js';

const DLQ_WORKER_ID = 'DLQ-Monitor';

async function startDLQConsumer() {
    try {
        const connection = await amqplib.connect(RABBITMQ_URL);
        const channel = await connection.createChannel();
    
        await channel.assertQueue(DEAD_LETTER_QUEUE, { durable: true });
    
        console.log(`[${DLQ_WORKER_ID}] Запущен, мониторинг Dead Letter Queue...`);
    
        channel.consume(DEAD_LETTER_QUEUE, async (msg) => {
            if (!msg) return;
      
            const deadTask = JSON.parse(msg.content.toString());
      
            console.log('\n☠️ === Сообщение в Dead Letter Queue === ☠️');
            console.log(`  Задача ID: ${deadTask.id}`);
            console.log(`  Тип: ${deadTask.type}`);
            console.log(`  Причина: ${deadTask.reason}`);
            console.log(`  Время смерти: ${deadTask.deadAt}`);
            console.log(`  Worker: ${deadTask.workerId}`);
            console.log('========================================\n');
      
            // Здесь можно добавить логику для повторной обработки
            // или отправки уведомления администратору
      
            channel.ack(msg);
        });
    
    } catch (error) {
        console.error(`[${DLQ_WORKER_ID}] Ошибка:`, error.message);
        setTimeout(startDLQConsumer, 5000);
    }
}

startDLQConsumer();