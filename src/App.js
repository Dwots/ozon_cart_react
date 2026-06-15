import './App.css';
import { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import CartDrawer from './components/CartDrawer';
import Header from './components/Header';
import { useCart } from './hooks/useCart';
import Cart from './pages/ProductsPage';


function App() {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const {
    cart,
    totalCount,
    totalPrice,
    addToCart,
    removeFromCart,
    decreaseItem,
    clearCart,
  } = useCart();

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js');
    }
  }, []);

  return (
    <div className="App">
      <Header totalCount={totalCount} onCartOpen={() => setIsCartOpen(true)} />

      <Routes>
        <Route path="/" element={<Navigate to="/cart" replace />} />
        <Route path="/cart" element={<Cart addToCart={addToCart} />} />
        <Route path="*" element={<Navigate to="/cart" replace />} />
      </Routes>

      <CartDrawer
        cart={cart}
        isOpen={isCartOpen}
        totalCount={totalCount}
        totalPrice={totalPrice}
        onClose={() => setIsCartOpen(false)}
        onAdd={addToCart}
        onDecrease={decreaseItem}
        onRemove={removeFromCart}
        onClear={clearCart}
      />
    </div>
  );
}

export default App;
