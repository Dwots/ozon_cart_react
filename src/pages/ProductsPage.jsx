import './ProductsPage_addition/ProductsPage.css';
import { useProducts } from '../hooks/useProducts';
import AddToCartButton from '../components/AddToCartButton';

function ProductsPage({ addToCart }) {
  const { products, status } = useProducts();

  return (
    <div className="ProductsPage">
      <section className="products-section">
        <h2>Товары</h2>

        {status === 'loading' && <p className="products-loading">Загрузка товаров…</p>}

        {status === 'fallback' && (
          <p className="products-fallback">
            Не удалось загрузить актуальные данные — показан сохранённый список.
          </p>
        )}

        <div className="products-list">
          {products.map((product) => {
            const inStock = product.stock > 0;

            return (
              <div className="product-card" key={product.id}>
                <img src={product.link} alt={product.title} />
                <h3>{product.title}</h3>

                <div className="product-rating" title={`Рейтинг ${product.rating}`}>
                  <span className="product-rating-star">★</span>
                  {product.rating.toFixed(1)}
                </div>

                <p className="product-price">Цена: {product.price} ₽</p>

                <p className={`product-stock ${inStock ? '' : 'product-stock-out'}`}>
                  {inStock ? `В наличии: ${product.stock} шт.` : 'Нет в наличии'}
                </p>

                <AddToCartButton
                  product={product}
                  onAdd={addToCart}
                  disabled={!inStock}
                />
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export default ProductsPage;
