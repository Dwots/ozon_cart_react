export default function CartDrawer({
  cart,
  isOpen,
  totalCount,
  totalPrice,
  onClose,
  onAdd,
  onDecrease,
  onRemove,
  onClear,
}) {
  return (
    <>
      <div
        className={`cart-overlay ${isOpen ? 'cart-overlay-open' : ''}`}
        onClick={onClose}
      />

      <aside className={`cart-drawer ${isOpen ? 'cart-drawer-open' : ''}`} aria-hidden={!isOpen}>
        <div className="cart-drawer-header">
          <h2>Корзина</h2>
          <button className="cart-close" type="button" onClick={onClose}>
            Закрыть
          </button>
        </div>

        {cart.length === 0 ? (
          <p className="cart-empty">Корзина пустая</p>
        ) : (
          <>
            <div className="cart-drawer-list">
              {cart.map((item) => (
                <div className="cart-drawer-card" key={item.id}>
                  <h3>{item.title}</h3>
                  <p>Цена: {item.price} ₽</p>
                  <p>Количество: {item.quantity}</p>
                  <p>Сумма: {item.price * item.quantity} ₽</p>

                  <div className="cart-drawer-buttons">
                    <button type="button" onClick={() => onDecrease(item.id)}>-</button>
                    <button type="button" onClick={() => onAdd(item)}>+</button>
                    <button type="button" onClick={() => onRemove(item.id)}>Удалить</button>
                  </div>
                </div>
              ))}
            </div>

            <div className="cart-drawer-total">
              <p>Всего товаров: {totalCount}</p>
              <p>Итого: {totalPrice} ₽</p>
              <button type="button" onClick={onClear}>Очистить корзину</button>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
