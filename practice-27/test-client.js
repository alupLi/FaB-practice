const BASE_URL = 'http://localhost:3000';

const testTasks = [
    {
        type: 'email',
        payload: {
            to: 'user1@example.com',
            subject: 'Добро пожаловать!',
            body: 'Спасибо за регистрацию в нашем сервисе.'
        }
    },
    {
        type: 'sms',
        payload: {
            phone: '+7 (999) 123-45-67',
            message: 'Ваш код подтверждения: 123456'
        }
    },
    {
        type: 'report',
        payload: {
            reportType: 'sales',
            params: { startDate: '2024-01-01', endDate: '2024-12-31' }
        }
    },
    {
        type: 'notification',
        payload: {
            userId: 'user-42',
            message: 'У вас новое сообщение'
        }
    },
    {
        type: 'email',
        payload: {
            to: 'user2@example.com',
            subject: 'Еженедельный отчёт',
            body: 'Ваш отчёт готов к просмотру.'
        }
    }
];

async function sendTasks() {
    console.log('🚀 Отправка тестовых задач...\n');
  
    for (let i = 0; i < testTasks.length; i++) {
        try {
            const response = await fetch(`${BASE_URL}/tasks`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(testTasks[i])
            });
      
            const data = await response.json();
            console.log(`✓ Задача ${i + 1} отправлена: ${data.taskId}`);
        } catch (error) {
            console.error(`✗ Ошибка отправки задачи ${i + 1}:`, error.message);
        }
    
        // Небольшая задержка между отправками
        await new Promise(resolve => setTimeout(resolve, 500));
    }
  
    console.log('\n✅ Все задачи отправлены!');
    console.log('📊 Откройте RabbitMQ Management UI: http://localhost:15672');
    console.log('   Логин/пароль: guest/guest');
}

sendTasks();