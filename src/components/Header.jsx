import { Link } from 'react-router-dom';

const WORKER_STATUS_LABELS = {
  connecting: 'SharedWorker: подключение…',
  connected: 'SharedWorker: подключён',
  unsupported: 'SharedWorker: не поддерживается',
  error: 'SharedWorker: ошибка',
};

export default function Header({ totalCount, isOnline, workerStatus, onCartOpen }) {
  const workerLabel = WORKER_STATUS_LABELS[workerStatus] || 'SharedWorker: —';

  return (
    <header className="app-header">
      <div className="header-main">
        <Link className="brand-link" to="/cart" aria-label="На главную">
          Ozon Cart
        </Link>

        <div className="header-status">
          <span className={`status-badge status-worker status-worker-${workerStatus}`}>
            {workerLabel}
          </span>

          <span className={`status-badge status-net ${isOnline ? 'status-online' : 'status-offline'}`}>
            {isOnline ? 'Онлайн' : 'Офлайн-режим'}
          </span>
        </div>

        <button className="cart-link" type="button" onClick={onCartOpen}>
          Корзина
          {totalCount > 0 && <span className="cart-count">{totalCount}</span>}
        </button>
      </div>
    </header>
  );
}
