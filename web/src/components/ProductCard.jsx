import { Eye, ShoppingCart, Star } from "lucide-react";

export default function ProductCard({ product, onView, onAdd }) {
  const discount = product.original_price && Number(product.original_price) > Number(product.price)
    ? Math.round((1 - Number(product.price) / Number(product.original_price)) * 100)
    : 0;
  const stock = Number(product.stock || 0);
  const outOfStock = stock <= 0;

  return (
    <article className={`product-card ${outOfStock ? "is-out" : ""}`}>
      <div className="product-image-wrap">
        {discount > 0 && <span className="deal-badge">{discount}% off</span>}
        {outOfStock && <span className="stock-badge">Out of stock</span>}
        <img src={product.image_url} alt={product.name} />
      </div>
      <div className="product-card-body">
        <div className="product-meta">
          <span className="category">{product.category_name}</span>
          <span>{product.brand}</span>
        </div>
        <h3>{product.name}</h3>
        <div className="rating-line">
          <Star size={16} fill="currentColor" />
          <strong>{Number(product.rating || 0).toFixed(1)}</strong>
          <span>({Number(product.rating_count || 0).toLocaleString()})</span>
        </div>
        <p>{product.description}</p>
        <ul className="mini-highlights">
          {(product.highlights || []).slice(0, 3).map((item) => <li key={item}>{item}</li>)}
        </ul>
        <div className="card-footer">
          <div>
            <strong>${Number(product.price).toFixed(2)}</strong>
            {product.original_price && <del>${Number(product.original_price).toFixed(2)}</del>}
          </div>
          <span className={outOfStock ? "stock-text out" : "stock-text"}>{outOfStock ? "Out of stock" : `${stock} in stock`}</span>
        </div>
        <div className="actions">
          <button onClick={onView}>
            <Eye size={18} /> Details
          </button>
          <button className="primary" onClick={onAdd} disabled={outOfStock}>
            <ShoppingCart size={18} /> {outOfStock ? "Sold out" : "Add"}
          </button>
        </div>
      </div>
    </article>
  );
}
