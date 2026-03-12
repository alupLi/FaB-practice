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

const PrivateRoute = ({ children }) => {
    const token = localStorage.getItem('accessToken');
    return token ? children : <Navigate to="/login" />;
};

function App() {
    const [user, setUser] = useState(null);

    useEffect(() => {
        const fetchUser = async () => {
            const token = localStorage.getItem('accessToken');
            if (token) {
                try {
                    const { data } = await authAPI.getMe();
                    setUser(data);
                } catch (error) {
                    localStorage.removeItem('accessToken');
                    localStorage.removeItem('refreshToken');
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
                                <PrivateRoute>
                                    <Products />
                                </PrivateRoute>
                            }
                        />
                        <Route
                            path="/products/:id"
                            element={
                                <PrivateRoute>
                                    <ProductDetail />
                                </PrivateRoute>
                            }
                        />
                        <Route
                            path="/products/:id/edit"
                            element={
                                <PrivateRoute>
                                    <ProductForm />
                                </PrivateRoute>
                            }
                        />
                        <Route
                            path="/create"
                            element={
                                <PrivateRoute>
                                    <ProductForm />
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