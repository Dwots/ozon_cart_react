
function AddToCartButton({ product, onAdd, disabled = false }){

    return (
        <button type='button' onClick={() => onAdd(product)} disabled={disabled}>
            {disabled ? 'Нет в наличии' : 'Добавить в корзину'}
        </button>
    );
}

export default AddToCartButton;
