import { useEffect, useState } from 'react';
import { products as fallbackProducts } from '../data/products';

const PRODUCTS_URL = `${process.env.PUBLIC_URL}/api/products.json`;

// Загрузка списка товаров как "API-данных".
// Service Worker применяет к этому запросу стратегию Network First,
// поэтому при наличии сети приходят свежие данные, а офлайн — из кеша.
// Если запрос не удался и кеша нет (например, dev без SW) — берём
// встроенный список как резервный, чтобы каталог не оставался пустым.
export function useProducts() {
  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    let cancelled = false;

    async function loadProducts() {
      try {
        const response = await fetch(PRODUCTS_URL);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        if (!cancelled) {
          setProducts(data);
          setStatus('success');
        }
      } catch {
        if (!cancelled) {
          setProducts(fallbackProducts);
          setStatus('fallback');
        }
      }
    }

    loadProducts();

    return () => {
      cancelled = true;
    };
  }, []);

  return { products, status };
}
