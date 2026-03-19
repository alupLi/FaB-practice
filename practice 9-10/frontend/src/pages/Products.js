import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { productsAPI } from '../services/api';

const Products = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            const response = await productsAPI.getAll();
            setProducts(response.data);
        } catch (err) {
            setError('Ошибка при загрузке товаров');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Вы уверены?')) {
            try {
                await productsAPI.delete(id);
                setProducts(products.filter(p => p.id !== id));
            } catch (err) {
                setError('Ошибка при удалении');
            }
        }
    };

    if (loading) return <div className="loading">Загрузка...</div>;

    return (
        <div>
            <div className="header-actions">
                <h1>Товары</h1>
                <Link to="/create" className="btn-create">+ Создать товар</Link>
            </div>

            {error && <div className="error-message">{error}</div>}

            {products.length === 0 ? (
                <p>Нет товаров</p>
            ) : (
                <div className="products-grid">
                    {products.map(product => (
                        <div key={product.id} className="product-card">
                            <h3>{product.title}</h3>
                            <div className="category">{product.category}</div>
                            <p>{product.description.substring(0, 100)}...</p>
                            <div className="price">{product.price} ₽</div>
                            <div className="product-actions">
                                <Link to={`/products/${product.id}`} className="btn-view">Просмотр</Link>
                                <Link to={`/products/${product.id}/edit`} className="btn-edit">Редакт.</Link>
                                <button onClick={() => handleDelete(product.id)} className="btn-delete">Удалить</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Products;