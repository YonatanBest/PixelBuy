import { ClipboardList, Mail, Shield, ShoppingCart, UserRound } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";

export default function Profile({ go }) {
  const { user } = useAuth();
  const { cart } = useCart();

  if (!user) {
    return <section className="empty-state"><h1>Login required</h1><button className="primary" onClick={() => go({ name: "login" })}>Login</button></section>;
  }

  return (
    <section>
      <div className="page-heading">
        <div>
          <span className="eyebrow">Account</span>
          <h1>{user.name}</h1>
          <p>Manage your store activity from one place.</p>
        </div>
      </div>
      <div className="profile-layout">
        <article className="profile-panel">
          <UserRound size={42} />
          <h2>{user.name}</h2>
          <p><Mail size={16} /> {user.email}</p>
          <p><Shield size={16} /> {user.role === "admin" ? "Administrator" : "Customer"}</p>
        </article>
        <div className="profile-actions-grid">
          <button onClick={() => go({ name: "orders" })}>
            <ClipboardList size={22} />
            <span>Orders</span>
            <small>See products you bought</small>
          </button>
          <button onClick={() => go({ name: "cart" })}>
            <ShoppingCart size={22} />
            <span>Cart</span>
            <small>{Number(cart.item_count || 0)} item{Number(cart.item_count || 0) === 1 ? "" : "s"} waiting</small>
          </button>
          {user.role === "admin" && (
            <button onClick={() => go({ name: "admin" })}>
              <Shield size={22} />
              <span>Admin</span>
              <small>Inventory and order controls</small>
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
