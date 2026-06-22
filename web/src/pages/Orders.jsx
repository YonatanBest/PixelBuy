import { ArrowLeft, PackageCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../api/apiClient";
import { useAuth } from "../context/AuthContext";

export default function Orders({ go }) {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user) {
      api.orders()
        .then((res) => setOrders(res.data || []))
        .catch((err) => setError(err.message));
    }
  }, [user?.id]);

  if (!user) {
    return <section className="empty-state"><h1>Login required</h1><button className="primary" onClick={() => go({ name: "login" })}>Login</button></section>;
  }

  return (
    <section>
      <div className="page-heading">
        <div>
          <span className="eyebrow">Your purchases</span>
          <h1>Orders</h1>
          <p>Review each order and the exact items you bought.</p>
        </div>
        <button onClick={() => go({ name: "products" })}><ArrowLeft size={18} /> Store</button>
      </div>
      {error && <p className="error">{error}</p>}
      <div className="orders-list">
        {orders.map((order) => (
          <article className="order-card" key={order.id}>
            <div className="order-head">
              <div>
                <span className="eyebrow">Order #{order.id}</span>
                <h2>${Number(order.total || 0).toFixed(2)}</h2>
              </div>
              <span className="status-pill">{order.status}</span>
            </div>
            <p>{new Date(order.created_at).toLocaleString()} · {order.delivery_method || "Standard delivery"}</p>
            <div className="order-items">
              {(order.items || []).map((item) => (
                <div key={item.id} className="order-item">
                  <img src={item.image_url} alt={item.name} />
                  <div>
                    <strong>{item.name}</strong>
                    <span>{item.brand || "Product"} · Qty {item.quantity}</span>
                  </div>
                  <strong>${(Number(item.price) * Number(item.quantity)).toFixed(2)}</strong>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
      {!orders.length && !error && (
        <section className="empty-state compact">
          <PackageCheck size={38} />
          <h2>No orders yet</h2>
          <button className="primary" onClick={() => go({ name: "products" })}>Start Shopping</button>
        </section>
      )}
    </section>
  );
}
