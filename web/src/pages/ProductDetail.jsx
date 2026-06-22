import { ArrowLeft, ExternalLink, ShieldCheck, ShoppingCart, Star, Truck } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../api/apiClient";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";

export default function ProductDetail({ id, go }) {
  const [product, setProduct] = useState(null);
  const { add } = useCart();
  const { user } = useAuth();

  useEffect(() => {
    api.product(id).then((res) => setProduct(res.data));
  }, [id]);

  if (!product) return <p>Loading product...</p>;

  const addProduct = async () => {
    if (!user) return go({ name: "login" });
    await add(product.id);
    go({ name: "cart" });
  };
  const stock = Number(product.stock || 0);
  const outOfStock = stock <= 0;

  return (
    <section>
      <button onClick={() => go({ name: "products" })}><ArrowLeft size={18} /> Back</button>
      <div className="detail-layout">
        <div className="detail-media">
          <img src={product.image_url} alt={product.name} />
          <div className="trust-row">
            <span><Truck size={18} /> {product.shipping_note || "Fast demo shipping"}</span>
            <span><ShieldCheck size={18} /> {product.warranty || "Warranty included"}</span>
          </div>
        </div>
        <div className="detail-info">
          <div className="product-meta">
            <span className="category">{product.category_name}</span>
            <span>{product.brand}</span>
            {product.model_number && <span>{product.model_number}</span>}
          </div>
          <h1>{product.name}</h1>
          <div className="rating-line large">
            <Star size={18} fill="currentColor" />
            <strong>{Number(product.rating || 0).toFixed(1)}</strong>
            <span>{Number(product.rating_count || 0).toLocaleString()} ratings</span>
          </div>
          <p>{product.description}</p>
          <div className="buy-box">
            <div>
              <h2>${Number(product.price).toFixed(2)}</h2>
              {product.original_price && <del>${Number(product.original_price).toFixed(2)}</del>}
            </div>
            <p className={outOfStock ? "stock-text out" : "stock-text"}>{outOfStock ? "Out of stock" : `${stock} items available`}</p>
            <button className="primary" onClick={addProduct} disabled={outOfStock}><ShoppingCart size={18} /> {outOfStock ? "Sold out" : "Add to Cart"}</button>
            {product.product_url && <a className="source-link" href={product.product_url} target="_blank" rel="noreferrer"><ExternalLink size={16} /> Product source/spec page</a>}
          </div>
          <section className="spec-section">
            <h3>Key Features</h3>
            <ul className="feature-list">
              {(product.highlights || []).map((item) => <li key={item}>{item}</li>)}
            </ul>
          </section>
          <section className="spec-section">
            <h3>Technical Details</h3>
            <div className="spec-grid">
              {Object.entries(product.specs || {}).map(([key, value]) => (
                <div key={key}><span>{key}</span><strong>{value}</strong></div>
              ))}
            </div>
          </section>
          <div className="reviews">
            <h3>Reviews</h3>
            {product.reviews?.length ? product.reviews.map((review) => (
              <article key={review.id} className="review">
                <strong>{review.rating}/5 from {review.user_name}</strong>
                <p>{review.comment}</p>
              </article>
            )) : <p>No reviews yet. Ask the assistant to review this product after trying it.</p>}
          </div>
        </div>
      </div>
    </section>
  );
}
