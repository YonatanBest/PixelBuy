import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";

export default function Cart({ go }) {
  const { user } = useAuth();
  const { cart, loadCart, update, remove } = useCart();
  const [error, setError] = useState("");

  useEffect(() => {
    if (user) loadCart().catch((err) => setError(err.message));
  }, [user]);

  if (!user) {
    return <section className="empty-state"><h1>Login required</h1><button className="primary" onClick={() => go({ name: "login" })}>Login</button></section>;
  }

  return (
    <section>
      <div className="page-heading">
        <div>
          <h1>Shopping Cart</h1>
          <p>{Number(cart.item_count || 0)} item{Number(cart.item_count || 0) === 1 ? "" : "s"} ready for checkout</p>
        </div>
        <button className="primary" disabled={!cart.items.length} onClick={() => go({ name: "checkout" })}>Checkout</button>
      </div>
      {error && <p className="error">{error}</p>}
      <div className="cart-list">
        {cart.items.map((item) => (
          <article className="cart-row" key={item.id}>
            <img src={item.image_url} alt={item.name} />
            <div><h3>{item.name}</h3><p>${Number(item.price).toFixed(2)} · {Number(item.stock || 0) > 0 ? `${item.stock} in stock` : "Out of stock"}</p></div>
            <input type="number" min="1" max={Math.max(1, Number(item.stock || 1))} value={item.quantity} onChange={(event) => update(item.id, Number(event.target.value)).catch((err) => setError(err.message))} />
            <button onClick={() => remove(item.id)}><Trash2 size={18} /></button>
          </article>
        ))}
      </div>
      {!cart.items.length && <section className="empty-state compact"><h2>Your cart is empty</h2><button onClick={() => go({ name: "products" })}>Continue Shopping</button></section>}
      <h2>Total: ${Number(cart.total || 0).toFixed(2)}</h2>
    </section>
  );
}
