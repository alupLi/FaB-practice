import amqplib from 'amqplib';
import { 
    RABBITMQ_URL, 
    QUEUE_NAME, 
    DEAD_LETTER_EXCHANGE,
    MAX_RETRIES 
} from './config.js';

const WORKER_ID = process.env.WORKER_ID || Math.floor(Math.random() * 1000);

let connection = null;
let channel = null;

// Функция с экспоненциальной задержкой
function exponentialBackoff(attempt) {
    const baseDelay = 1000; // 1 секунда
    const maxDelay = 30000; // 30 секунд
    const exponentialDelay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
    const jitter = Math.random() * 1000;
    return exponentialDelay + jitter;
}

// Обработка задачи с retry логикой
async function processTaskWithRetry(task, attempt = 1) {
    console.log(`[Worker ${WORKER_ID}] Попытка ${attempt}/${MAX_RETRIES} для задачи ${task.id} (тип: ${task.type})`);
  
    try {
        // Имитация обработки задачи
        await processTask(task);
        console.log(`[Worker ${WORKER_ID}] ✓ Задача ${task.id} успешно выполнена`);
        return true;
    } catch (error) {
        console.error(`[Worker ${WORKER_ID}] ✗ Ошибка при обработке задачи ${task.id}:`, error.message);
    
        if (attempt < MAX_RETRIES) {
            const delay = exponentialBackoff(attempt);
            console.log(`[Worker ${WORKER_ID}] Повтор через ${Math.round(delay)}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return processTaskWithRetry(task, attempt + 1);
        } else {
            console.error(`[Worker ${WORKER_ID}] ✗ Задача ${task.id} не удалась после ${MAX_RETRIES} попыток`);
            return false;
        }
    }
}

// Обработка различных типов задач
async function processTask(task) {
    // Имитация различных сценариев обработки
    switch (task.type) {
        case 'email':
            console.log(`[Worker ${WORKER_ID}] 📧 Отправка email на ${task.payload.to}`);
            console.log(`[Worker ${WORKER_ID}]    Тема: ${task.payload.subject}`);
            console.log(`[Worker ${WORKER_ID}]    Содержание: ${task.payload.body?.substring(0, 50) || ''}...`);
            await simulateWork(2000);
            // Имитация случайной ошибки (20% вероятность для демонстрации retry)
            if (Math.random() < 0.2) {
                throw new Error('Email сервис временно недоступен');
            }
            break;
      
        case 'sms':
            console.log(`[Worker ${WORKER_ID}] 💬 Отправка SMS на номер ${task.payload.phone}`);
            console.log(`[Worker ${WORKER_ID}]    Сообщение: ${task.payload.message}`);
            await simulateWork(1000);
            break;
      
        case 'report':
            console.log(`[Worker ${WORKER_ID}] 📊 Генерация отчёта: ${task.payload.reportType}`);
            console.log(`[Worker ${WORKER_ID}]    Параметры:`, task.payload.params);
            await simulateWork(3000);
            break;
      
        case 'notification':
            console.log(`[Worker ${WORKER_ID}] 🔔 Отправка уведомления пользователю ${task.payload.userId}`);
            console.log(`[Worker ${WORKER_ID}]    Уведомление: ${task.payload.message}`);
            await simulateWork(500);
            break;
      
        default:
            console.log(`[Worker ${WORKER_ID}] ⚙️ Обработка задачи типа: ${task.type}`);
            console.log(`[Worker ${WORKER_ID}]    Данные:`, task.payload);
            await simulateWork(1500);
    }
}

// Имитация длительной работы
function simulateWork(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Отправка сообщения в Dead Letter Queue
async function sendToDLQ(task, reason) {
    try {
        const newChannel = await connection.createChannel();
        await newChannel.assertExchange(DEAD_LETTER_EXCHANGE, 'direct', { durable: true });
    
        const deadTask = {
            ...task,
            deadAt: new Date().toISOString(),
            reason: reason,
            workerId: WORKER_ID
        };
    
        newChannel.publish(DEAD_LETTER_EXCHANGE, 'dead', Buffer.from(JSON.stringify(deadTask)), {
            persistent: true
        });
    
        console.log(`[Worker ${WORKER_ID}] ☠️ Задача ${task.id} отправлена в Dead Letter Queue`);
        await newChannel.close();
    } catch (error) {
        console.error(`[Worker ${WORKER_ID}] Ошибка отправки в DLQ:`, error.message);
    }
}

// Запуск Consumer
async function startConsumer() {
    try {
        connection = await amqplib.connect(RABBITMQ_URL);
        channel = await connection.createChannel();
    
        // ВАЖНО: НЕ создаём очередь заново, а только проверяем её существование
        // Если очередь не существует, выбрасывается ошибка 404
        try {
            await channel.checkQueue(QUEUE_NAME);
            console.log(`[Worker ${WORKER_ID}] Очередь "${QUEUE_NAME}" найдена`);
        } catch (error) {
            if (error.code === 404) {
                console.error(`[Worker ${WORKER_ID}] Очередь "${QUEUE_NAME}" не существует!`);
                console.error(`[Worker ${WORKER_ID}] Запустите сначала: npm run setup`);
                process.exit(1);
            }
            throw error;
        }
    
        // Обрабатываем по одному сообщению за раз
        channel.prefetch(1);
    
        console.log(`[Worker ${WORKER_ID}] Запущен, ожидание задач...`);
        console.log(`[Worker ${WORKER_ID}] Максимальное количество попыток: ${MAX_RETRIES}`);
    
        channel.consume(QUEUE_NAME, async (msg) => {
            if (!msg) return;
      
            try {
                const task = JSON.parse(msg.content.toString());
        
                console.log(`[Worker ${WORKER_ID}] Получена задача: ${task.id}`);
        
                // Обрабатываем задачу с retry логикой
                const success = await processTaskWithRetry(task, 1);
        
                if (success) {
                    // Подтверждаем успешную обработку
                    channel.ack(msg);
                } else {
                    // Отправляем в DLQ
                    await sendToDLQ(task, `Не удалось обработать после ${MAX_RETRIES} попыток`);
                    channel.ack(msg); // Удаляем из основной очереди
                }
            } catch (error) {
                console.error(`[Worker ${WORKER_ID}] Критическая ошибка:`, error.message);
                // Отправляем в DLQ при критической ошибке
                try {
                    const task = JSON.parse(msg.content.toString());
                    await sendToDLQ(task, `Критическая ошибка: ${error.message}`);
                } catch (parseError) {
                    console.error(`[Worker ${WORKER_ID}] Не удалось разобрать сообщение`);
                }
                channel.ack(msg); // Удаляем повреждённое сообщение
            }
        });
    
        // Обработка закрытия соединения
        process.on('SIGINT', async () => {
            console.log(`[Worker ${WORKER_ID}] Завершение работы...`);
            await channel.close();
            await connection.close();
            process.exit(0);
        });
    
    } catch (error) {
        console.error(`[Worker ${WORKER_ID}] Ошибка подключения:`, error.message);
        setTimeout(startConsumer, 5000);
    }
}

// Запуск Consumer
startConsumer();