import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Navigation = ({ user, setUser }) => {
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
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