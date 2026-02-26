import React, { useEffect, useState } from "react";

export default function ProductModal({ open, mode, initialProduct, onClose, onSubmit }) {
    const [formData, setFormData] = useState({
        name: "",
        category: "",
        description: "",
        price: "",
        stock: "",
        rating: "",
        image: ""
    });

    useEffect(() => {
        if (!open) return;
        setFormData({
            name: initialProduct?.name ?? "",
            category: initialProduct?.category ?? "",
            description: initialProduct?.description ?? "",
            price: initialProduct?.price != null ? String(initialProduct.price) : "",
            stock: initialProduct?.stock != null ? String(initialProduct.stock) : "",
            rating: initialProduct?.rating != null ? String(initialProduct.rating) : "",
            image: initialProduct?.image ?? ""
        });
    }, [open, initialProduct]);

    if (!open) return null;

    const title = mode === "edit" ? "Редактирование товара" : "Создание товара";

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        const trimmed = {
            name: formData.name.trim(),
            category: formData.category.trim(),
            description: formData.description.trim()
        };

        const parsedPrice = Number(formData.price);
        const parsedStock = Number(formData.stock);
        const parsedRating = Number(formData.rating);

        if (!trimmed.name) {
            alert("Введите название товара");
            return;
        }

        if (!trimmed.category) {
            alert("Введите категорию");
            return;
        }

        if (!trimmed.description) {
            alert("Введите описание");
            return;
        }

        if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
            alert("Введите корректную цену");
            return;
        }

        if (!Number.isInteger(parsedStock) || parsedStock < 0) {
            alert("Введите корректное количество на складе");
            return;
        }

        if (parsedRating && (!Number.isFinite(parsedRating) || parsedRating < 0 || parsedRating > 5)) {
            alert("Введите корректный рейтинг (0–5)");
            return;
        }

        onSubmit({
            id: initialProduct?.id,
            name: trimmed.name,
            category: trimmed.category,
            description: trimmed.description,
            price: parsedPrice,
            stock: parsedStock,
            rating: parsedRating || 0,
            image: formData.image.trim() || `https://cleanshop.ru/i/no_image.gif`
        });
    };

    return (
        <div className="backdrop" onMouseDown={onClose}>
            <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
                <div className="modal__header">
                    <div className="modal__title">{title}</div>
                    <button className="iconBtn" onClick={onClose}>✕</button>
                </div>

                <form className="form" onSubmit={handleSubmit}>
                    <label className="label">
                        Название
                        <input className="input" name="name" value={formData.name} onChange={handleChange} autoFocus />
                    </label>

                    <label className="label">
                        Категория
                        <input className="input" name="category" value={formData.category} onChange={handleChange} />
                    </label>

                    <label className="label">
                        Описание
                        <textarea className="input textarea" name="description" value={formData.description} onChange={handleChange} rows="2" />
                    </label>

                    <div className="form-row">
                        <label className="label">
                            Цена ($)
                            <input className="input" name="price" type="number" step="0.01" min="0" value={formData.price} onChange={handleChange} />
                        </label>

                        <label className="label">
                            В наличии (шт.)
                            <input className="input" name="stock" type="number" min="0" step="1" value={formData.stock} onChange={handleChange} />
                        </label>
                    </div>

                    <div className="form-row">
                        <label className="label">
                            Рейтинг (0-5)
                            <input className="input" name="rating" type="number" step="0.1" min="0" max="5" value={formData.rating} onChange={handleChange} />
                        </label>

                        <label className="label">
                            URL фото
                            <input className="input" name="image" value={formData.image} onChange={handleChange} />
                        </label>
                    </div>

                    <div className="modal__footer">
                        <button type="button" className="btn" onClick={onClose}>Отмена</button>
                        <button type="submit" className="btn btn--primary">
                            {mode === "edit" ? "Сохранить" : "Создать"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}