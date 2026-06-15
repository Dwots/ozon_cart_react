import './ProductsPage_addition/ProductsPage.css';
import { products } from '../data/products';
import AddToCartButton from '../components/AddToCartButton';

function ProductsPage({ addToCart }) {
  return (
    <div className="ProductsPage">
      <section className="products-section">
        <h2>Товары</h2>

        <div className="products-list">
          {products.map((product) => (
            <div className="product-card" key={product.id}>
              <img src={product.link} alt={product.title} />
              <h3>{product.title}</h3>
              <p>Цена: {product.price} ₽</p>

              <AddToCartButton product={product} onAdd={addToCart} />

            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default ProductsPage;
