
function AddToCartButton({ product, onAdd }){

    return (
        <button type='button' onClick={() => onAdd={product}}> 
            Добавить в корзину
        </button>
    );
}

export default AddToCartButton;