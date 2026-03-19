import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

import { authAPI } from './services/api';

import Navigation from './components/Navigation';
import Login from './pages/Login';
import Register from './pages/Register';
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import ProductForm from './pages/ProductForm';
import Users from './pages/Users';

const PrivateRoute = ({ children, allowedRoles = [] }) => {
    const token = localStorage.getItem('accessToken');
    const user = JSON.parse(localStorage.getItem('user') || 'null');

    if (!token) {
        return <Navigate to="/login" />;
    }

    if (allowedRoles.length > 0 && (!user || !allowedRoles.includes(user.role))) {
        return <Navigate to="/products" />;
    }

    return children;
};

function App() {
    const [user, setUser] = useState(null);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }

        const fetchUser = async () => {
            const token = localStorage.getItem('accessToken');
            if (token && !storedUser) {
                try {
                    const { data } = await authAPI.getMe();
                    setUser(data);
                    localStorage.setItem('user', JSON.stringify(data));
                } catch (error) {
                    localStorage.removeItem('accessToken');
                    localStorage.removeItem('refreshToken');
                    localStorage.removeItem('user');
                }
            }
        };
        fetchUser();
    }, []);

    return (
        <Router>
            <div className="App">
                <Navigation user={user} setUser={setUser} />
                <main className="container">
                    <Routes>
                        <Route path="/login" element={<Login setUser={setUser} />} />
                        <Route path="/register" element={<Register />} />
                        <Route path="/" element={<Navigate to="/products" />} />

                        <Route
                            path="/products"
                            element={
                                <PrivateRoute allowedRoles={['user', 'seller', 'admin']}>
                                    <Products />
                                </PrivateRoute>
                            }
                        />

                        <Route
                            path="/products/:id"
                            element={
                                <PrivateRoute allowedRoles={['user', 'seller', 'admin']}>
                                    <ProductDetail />
                                </PrivateRoute>
                            }
                        />

                        <Route
                            path="/products/:id/edit"
                            element={
                                <PrivateRoute allowedRoles={['seller', 'admin']}>
                                    <ProductForm />
                                </PrivateRoute>
                            }
                        />

                        <Route
                            path="/create"
                            element={
                                <PrivateRoute allowedRoles={['seller', 'admin']}>
                                    <ProductForm />
                                </PrivateRoute>
                            }
                        />

                        <Route
                            path="/users"
                            element={
                                <PrivateRoute allowedRoles={['admin']}>
                                    <Users />
                                </PrivateRoute>
                            }
                        />
                    </Routes>
                </main>
            </div>
        </Router>
    );
}

export default App;