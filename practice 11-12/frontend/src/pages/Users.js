import React, { useState, useEffect } from 'react';
import { usersAPI } from '../services/api';

const Users = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [editingUser, setEditingUser] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            setCurrentUser(JSON.parse(userData));
        }
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const response = await usersAPI.getAll();
            setUsers(response.data);
        } catch (err) {
            setError('Ошибка при загрузке пользователей');
        } finally {
            setLoading(false);
        }
    };

    const handleBlockUser = async (userId) => {
        if (window.confirm('Заблокировать пользователя?')) {
            try {
                await usersAPI.delete(userId);
                fetchUsers(); // Обновляем список
            } catch (err) {
                setError('Ошибка при блокировке пользователя');
            }
        }
    };

    const handleEditUser = (user) => {
        setEditingUser({ ...user });
    };

    const handleUpdateUser = async () => {
        try {
            await usersAPI.update(editingUser.id, editingUser);
            setEditingUser(null);
            fetchUsers();
        } catch (err) {
            setError('Ошибка при обновлении пользователя');
        }
    };

    const handleChange = (e) => {
        setEditingUser({
            ...editingUser,
            [e.target.name]: e.target.value
        });
    };

    if (loading) return <div className="loading">Загрузка...</div>;

    return (
        <div>
            <h1>Управление пользователями</h1>

            {error && <div className="error-message">{error}</div>}

            {editingUser && (
                <div className="modal">
                    <div className="modal-content">
                        <h3>Редактирование пользователя</h3>
                        <form onSubmit={(e) => { e.preventDefault(); handleUpdateUser(); }}>
                            <div className="form-group">
                                <label>Имя</label>
                                <input
                                    type="text"
                                    name="first_name"
                                    value={editingUser.first_name}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Фамилия</label>
                                <input
                                    type="text"
                                    name="last_name"
                                    value={editingUser.last_name}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Email</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={editingUser.email}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Роль</label>
                                <select
                                    name="role"
                                    value={editingUser.role}
                                    onChange={handleChange}
                                >
                                    <option value="user">Пользователь</option>
                                    <option value="seller">Продавец</option>
                                    <option value="admin">Администратор</option>
                                </select>
                            </div>
                            <div className="form-actions">
                                <button type="submit">Сохранить</button>
                                <button type="button" onClick={() => setEditingUser(null)}>Отмена</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <table className="users-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Имя</th>
                        <th>Фамилия</th>
                        <th>Email</th>
                        <th>Роль</th>
                        <th>Статус</th>
                        <th>Действия</th>
                    </tr>
                </thead>
                <tbody>
                    {users.map(user => (
                        <tr key={user.id} className={user.isBlocked ? 'blocked' : ''}>
                            <td>{user.id.substring(0, 8)}...</td>
                            <td>{user.first_name}</td>
                            <td>{user.last_name}</td>
                            <td>{user.email}</td>
                            <td>
                                {user.role === 'admin' ? 'Администратор' :
                                    user.role === 'seller' ? 'Продавец' : 'Пользователь'}
                            </td>
                            <td>{user.isBlocked ? 'Заблокирован' : 'Активен'}</td>
                            <td>
                                <button
                                    onClick={() => handleEditUser(user)}
                                    disabled={user.id === currentUser?.id}
                                >
                                    Редактировать
                                </button>
                                <button
                                    onClick={() => handleBlockUser(user.id)}
                                    disabled={user.isBlocked || user.id === currentUser?.id}
                                    className="btn-danger"
                                >
                                    Заблокировать
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default Users;