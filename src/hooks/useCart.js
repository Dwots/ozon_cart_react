import { useEffect, useMemo, useRef, useState } from 'react';

const CART_STORAGE_KEY = 'ozon-cart-items';

function getSavedCart() {
  try {
    const savedCart = localStorage.getItem(CART_STORAGE_KEY);
    return savedCart ? JSON.parse(savedCart) : [];
  } catch {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
}

export function useCart() {
  const [cart, setCart] = useState(getSavedCart);
  const portRef = useRef(null);

  useEffect(() => {
    if (!window.SharedWorker) {
      return;
    }

    const savedCart = getSavedCart();
    const workerUrl = `${process.env.PUBLIC_URL}/cart-shared-worker.js`;
    const worker = new SharedWorker(workerUrl);
    const port = worker.port;

    portRef.current = port;

    port.onmessage = function (event) {
      const message = event.data;

      if (message.type === 'CART_UPDATED') {
        setCart(message.cart);
        saveCart(message.cart);
      }
    };

    port.start();
    port.postMessage({
      type: 'HYDRATE_CART',
      cart: savedCart,
    });
    port.postMessage({ type: 'GET_CART' });

    return () => {
      port.postMessage({ type: 'DISCONNECT' });
      port.close();
      portRef.current = null;
    };
  }, []);

  function updateLocalCart(product) {
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.id === product.id);
      let nextCart;

      if (existingItem) {
        nextCart = prevCart.map((item) => {
          if (item.id === product.id) {
            return {
              ...item,
              quantity: item.quantity + 1,
            };
          }

          return item;
        });
      } else {
        nextCart = [
          ...prevCart,
          {
            ...product,
            quantity: 1,
          },
        ];
      }

      saveCart(nextCart);
      return nextCart;
    });
  }

  function addToCart(product) {
    if (portRef.current) {
      portRef.current.postMessage({
        type: 'ADD_ITEM',
        product,
      });
      return;
    }

    updateLocalCart(product);
  }

  function removeFromCart(productId) {
    if (portRef.current) {
      portRef.current.postMessage({
        type: 'REMOVE_ITEM',
        productId,
      });
      return;
    }

    setCart((prevCart) => {
      const nextCart = prevCart.filter((item) => item.id !== productId);
      saveCart(nextCart);
      return nextCart;
    });
  }

  function decreaseItem(productId) {
    if (portRef.current) {
      portRef.current.postMessage({
        type: 'DECREASE_ITEM',
        productId,
      });
      return;
    }

    setCart((prevCart) => {
      const nextCart = prevCart
        .map((item) => {
          if (item.id === productId) {
            return {
              ...item,
              quantity: item.quantity - 1,
            };
          }

          return item;
        })
        .filter((item) => item.quantity > 0);

      saveCart(nextCart);
      return nextCart;
    });
  }

  function clearCart() {
    if (portRef.current) {
      portRef.current.postMessage({
        type: 'CLEAR_CART',
      });
      return;
    }

    saveCart([]);
    setCart([]);
  }

  const totalPrice = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [cart]);

  const totalCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  return {
    cart,
    totalCount,
    totalPrice,
    addToCart,
    removeFromCart,
    decreaseItem,
    clearCart,
  };
}
