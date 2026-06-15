import { Link } from 'react-router-dom';

export default function Header({ totalCount, onCartOpen }) {
  return (
    <header className="app-header">
      <div className="header-main">
        <Link className="brand-link" to="/cart" aria-label="На главную">
          Ozon Cart
        </Link>

        <button className="cart-link" type="button" onClick={onCartOpen}>
          Корзина
          {totalCount > 0 && <span className="cart-count">{totalCount}</span>}
        </button>
      </div>
    </header>
  );
}
