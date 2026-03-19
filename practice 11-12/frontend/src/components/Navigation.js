import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Navigation = ({ user, setUser }) => {
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        setUser(null);
        navigate('/login');
    };

    return (
        <nav className="navbar">
            <div className="container">
                <Link to="/" className="navbar-brand">
                    Product Manager
                </Link>
                <div className="navbar-menu">
                    {user ? (
                        <>
                            <span>Привет, {user.first_name}!</span>
                            <span className="user-role">({user.role === 'admin' ? 'Администратор' :
                                user.role === 'seller' ? 'Продавец' : 'Пользователь'})</span>

                            {user.role === 'admin' && (
                                <Link to="/users" className="nav-link">Пользователи</Link>
                            )}

                            {(user.role === 'seller' || user.role === 'admin') && (
                                <Link to="/create" className="nav-link">+ Товар</Link>
                            )}

                            <Link to="/products" className="nav-link">Товары</Link>
                            <button onClick={handleLogout}>Выйти</button>
                        </>
                    ) : (
                        <>
                            <Link to="/login">Вход</Link>
                            <Link to="/register">Регистрация</Link>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default Navigation;