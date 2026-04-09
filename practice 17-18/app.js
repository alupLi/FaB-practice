const socket = io('http://localhost:3001');

const contentDiv = document.getElementById('app-content');
const homeBtn = document.getElementById('home-btn');
const aboutBtn = document.getElementById('about-btn');

const VAPID_PUBLIC_KEY = 'BOzLqHYbBqcQ2fgH0r9Fv4ZRGfgSeDRhggwHERxVqLYbBOhB6nsaK06bthNT5-PiLujmXG-O4xR_Yr6AYsEiF3g';

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

async function subscribeToPush() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        alert('Ваш браузер не поддерживает push-уведомления');
        return;
    }

    try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        });

        const response = await fetch('http://localhost:3001/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(subscription)
        });

        if (response.ok) {
            console.log('✅ Подписка на push отправлена');
        }
    } catch (err) {
        console.error('❌ Ошибка подписки на push:', err);
    }
}

async function unsubscribeFromPush() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();

        if (subscription) {
            await fetch('http://localhost:3001/unsubscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ endpoint: subscription.endpoint })
            });
            await subscription.unsubscribe();
            console.log('✅ Отписка выполнена');
        }
    } catch (err) {
        console.error('❌ Ошибка отписки:', err);
    }
}

function showFloatingNotification(task) {
    const notification = document.createElement('div');
    notification.innerHTML = `
        <strong>✨ Новая заметка от другого пользователя!</strong><br>
        ${task.text}
    `;
    notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: linear-gradient(135deg, #4285f4, #34a853);
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 12px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        z-index: 1000;
        animation: slideIn 0.3s ease;
        max-width: 300px;
        font-size: 14px;
    `;
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 4000);
}

const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

socket.on('taskAdded', (task) => {
    console.log('📨 Получена задача от другого клиента:', task);
    showFloatingNotification(task);
});

function setActiveButton(activeId) {
    [homeBtn, aboutBtn].forEach(btn => btn.classList.remove('active'));
    document.getElementById(activeId).classList.add('active');
}

async function loadContent(page) {
    try {
        const response = await fetch(`/content/${page}.html`);
        const html = await response.text();
        contentDiv.innerHTML = html;

        if (page === 'home') {
            initNotes();
        }
    } catch (err) {
        contentDiv.innerHTML = '<p class="is-center text-error">❌ Ошибка загрузки страницы.</p>';
        console.error(err);
    }
}

function initNotes() {
    const form = document.getElementById('note-form');
    const input = document.getElementById('note-input');
    const reminderForm = document.getElementById('reminder-form');
    const reminderText = document.getElementById('reminder-text');
    const reminderTime = document.getElementById('reminder-time');
    const list = document.getElementById('notes-list');

    if (!form) return;

    function loadNotes() {
        const notes = JSON.parse(localStorage.getItem('notes') || '[]');
        if (list) {
            if (notes.length === 0) {
                list.innerHTML = '<li style="text-align: center; color: #888;">📭 Нет заметок. Добавьте первую!</li>';
            } else {
                list.innerHTML = notes.map(note => {
                    let reminderInfo = '';
                    if (note.reminder) {
                        const date = new Date(note.reminder);
                        reminderInfo = '<br><small style="color: #e67e22;">🔔 Напоминание: ' + date.toLocaleString() + '</small>';
                    }
                    return `
                        <li style="background: #f5f5f5; margin: 8px 0; padding: 10px; border-radius: 5px;">
                            ${note.text}
                            ${reminderInfo}
                        </li>
                    `;
                }).join('');
            }
        }
    }

    function addNote(text) {
        const notes = JSON.parse(localStorage.getItem('notes') || '[]');
        const newNote = {
            id: Date.now(),
            text: text,
            datetime: new Date().toLocaleString()
        };
        notes.push(newNote);
        localStorage.setItem('notes', JSON.stringify(notes));
        loadNotes();

        socket.emit('newTask', { text: text, id: newNote.id });
        console.log('📤 Отправлено событие newTask на сервер:', text);
    }

    function addReminder(text, reminderTimeValue) {
        const reminderTimestamp = new Date(reminderTimeValue).getTime();
        const now = Date.now();

        if (reminderTimestamp <= now) {
            alert('⚠️ Время напоминания должно быть в будущем!');
            return;
        }

        const notes = JSON.parse(localStorage.getItem('notes') || '[]');
        const newNote = {
            id: Date.now(),
            text: text,
            datetime: new Date().toLocaleString(),
            reminder: reminderTimestamp
        };
        notes.push(newNote);
        localStorage.setItem('notes', JSON.stringify(notes));
        loadNotes();

        socket.emit('newReminder', {
            id: newNote.id,
            text: text,
            reminderTime: reminderTimestamp
        });
        console.log('📤 Отправлено напоминание на сервер:', text, 'на', new Date(reminderTimestamp).toLocaleString());

        alert(`✅ Напоминание установлено на ${new Date(reminderTimestamp).toLocaleString()}`);
    }

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = input.value.trim();
        if (text) {
            addNote(text);
            input.value = '';
        }
    });

    if (reminderForm) {
        reminderForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const text = reminderText.value.trim();
            const time = reminderTime.value;
            if (text && time) {
                addReminder(text, time);
                reminderText.value = '';
                reminderTime.value = '';
            }
        });
    }

    loadNotes();
}

homeBtn.addEventListener('click', () => {
    setActiveButton('home-btn');
    loadContent('home');
});

aboutBtn.addEventListener('click', () => {
    setActiveButton('about-btn');
    loadContent('about');
});

loadContent('home');

if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js');
            console.log('✅ ServiceWorker зарегистрирован:', registration.scope);

            const enableBtn = document.getElementById('enable-push');
            const disableBtn = document.getElementById('disable-push');

            if (enableBtn && disableBtn) {
                const subscription = await registration.pushManager.getSubscription();

                if (subscription) {
                    enableBtn.style.display = 'none';
                    disableBtn.style.display = 'inline-block';
                }

                enableBtn.addEventListener('click', async () => {
                    if (Notification.permission === 'denied') {
                        alert('🔕 Уведомления запрещены. Разрешите их в настройках браузера.');
                        return;
                    }
                    if (Notification.permission === 'default') {
                        const permission = await Notification.requestPermission();
                        if (permission !== 'granted') {
                            alert('⚠️ Необходимо разрешить уведомления.');
                            return;
                        }
                    }
                    await subscribeToPush();
                    enableBtn.style.display = 'none';
                    disableBtn.style.display = 'inline-block';
                });

                disableBtn.addEventListener('click', async () => {
                    await unsubscribeFromPush();
                    disableBtn.style.display = 'none';
                    enableBtn.style.display = 'inline-block';
                });
            }
        } catch (err) {
            console.error('❌ Ошибка регистрации ServiceWorker:', err);
        }
    });
}