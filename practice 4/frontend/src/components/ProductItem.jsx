import React from "react";

export default function ProductItem({ product, onEdit, onDelete }) {
    const isOutOfStock = product.stock === 0;

    return (
        <div className={`product-card ${isOutOfStock ? 'out-of-stock' : ''}`}>
            <div className="product-image">
                <img src={product.image} alt={product.name} />
            </div>

            <div className="product-category">{product.category}</div>
            <div className="product-name">{product.name}</div>
            <div className="product-description">{product.description}</div>

            {product.rating > 0 && (
                <div className="product-rating">
                    {"★".repeat(Math.floor(product.rating))}
                    {"☆".repeat(5 - Math.floor(product.rating))}
                    <span>{product.rating}</span>
                </div>
            )}

            <div className="product-details">
                <span className="product-price">${product.price}</span>
                <span className={`product-stock ${isOutOfStock ? 'out' : ''}`}>
                    {product.stock} шт.
                </span>
            </div>

            <div className="product-actions">
                <button className="btn" onClick={() => onEdit(product)}>
                    Изменить
                </button>
                <button className="btn btn--danger" onClick={() => onDelete(product.id)}>
                    Удалить
                </button>
            </div>
        </div>
    );
}