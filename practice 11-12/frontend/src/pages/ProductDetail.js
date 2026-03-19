import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { productsAPI } from '../services/api';

const ProductDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [user, setUser] = useState(null);

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            setUser(JSON.parse(userData));
        }
        fetchProduct();
    }, [id]);

    const fetchProduct = async () => {
        try {
            const response = await productsAPI.getById(id);
            setProduct(response.data);
        } catch (err) {
            setError('Ошибка при загрузке');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (window.confirm('Удалить товар?')) {
            try {
                await productsAPI.delete(id);
                navigate('/products');
            } catch (err) {
                setError('Ошибка при удалении. Возможно, у вас недостаточно прав.');
            }
        }
    };

    if (loading) return <div className="loading">Загрузка...</div>;
    if (error) return <div className="error-message">{error}</div>;
    if (!product) return <div>Товар не найден</div>;

    return (
        <div>
            <button onClick={() => navigate('/products')} className="back-button">
                ← Назад
            </button>

            <div className="product-detail">
                <h1>{product.title}</h1>
                <div className="category">Категория: {product.category}</div>
                <div className="price">{product.price} ₽</div>
                <div className="description">
                    <h3>Описание:</h3>
                    <p>{product.description}</p>
                </div>

                <div className="product-actions">
                    {(user?.role === 'seller' || user?.role === 'admin') && (
                        <Link to={`/products/${product.id}/edit`} className="btn-edit">
                            Редактировать
                        </Link>
                    )}

                    {user?.role === 'admin' && (
                        <button onClick={handleDelete} className="btn-delete">
                            Удалить
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProductDetail;