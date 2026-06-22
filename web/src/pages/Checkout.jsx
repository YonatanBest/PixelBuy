import { useEffect, useState } from "react";
import { api } from "../api/apiClient";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";

export default function Checkout({ go }) {
  const { user } = useAuth();
  const { cart, loadCart, setCart } = useCart();
  const [customer, setCustomer] = useState({
    customer_name: "Student User",
    email: "student@smartshop.test",
    phone: "+1 555 0100",
    address: "123 Demo Street",
    city: "Seattle",
    state: "WA",
    zip: "98101",
    payment_method: "Demo Visa",
    card_number: "4242 4242 4242 4242",
    delivery_method: "Standard delivery",
    notes: "Leave at front desk",
  });
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (user) loadCart().catch(() => {});
  }, [user?.id]);

  const submit = async (event) => {
    event.preventDefault();
    try {
      const res = await api.checkout(customer);
      setCart({ items: [], total: 0, item_count: 0 });
      setMessage(`Order #${res.data.id} placed successfully.`);
    } catch (err) {
      setMessage(err.message);
    }
  };

  return (
    <section className="checkout-layout">
      <form className="form-card" onSubmit={submit}>
        <span className="eyebrow">Dummy checkout</span>
        <h1>Delivery and payment</h1>
        <div className="form-grid">
          <label>Name<input value={customer.customer_name} onChange={(event) => setCustomer({ ...customer, customer_name: event.target.value })} /></label>
          <label>Email<input value={customer.email} onChange={(event) => setCustomer({ ...customer, email: event.target.value })} /></label>
          <label>Phone<input value={customer.phone} onChange={(event) => setCustomer({ ...customer, phone: event.target.value })} /></label>
          <label>Delivery method<select value={customer.delivery_method} onChange={(event) => setCustomer({ ...customer, delivery_method: event.target.value })}><option>Standard delivery</option><option>Express delivery</option><option>Store pickup</option></select></label>
        </div>
        <label>Delivery address<input value={customer.address} onChange={(event) => setCustomer({ ...customer, address: event.target.value })} /></label>
        <div className="form-grid">
          <label>City<input value={customer.city} onChange={(event) => setCustomer({ ...customer, city: event.target.value })} /></label>
          <label>State<input value={customer.state} onChange={(event) => setCustomer({ ...customer, state: event.target.value })} /></label>
          <label>ZIP<input value={customer.zip} onChange={(event) => setCustomer({ ...customer, zip: event.target.value })} /></label>
        </div>
        <div className="form-grid">
          <label>Payment<select value={customer.payment_method} onChange={(event) => setCustomer({ ...customer, payment_method: event.target.value })}><option>Demo Visa</option><option>Demo Mastercard</option><option>Pay on pickup</option></select></label>
          <label>Card number<input value={customer.card_number} onChange={(event) => setCustomer({ ...customer, card_number: event.target.value })} /></label>
        </div>
        <label>Order notes<textarea value={customer.notes} onChange={(event) => setCustomer({ ...customer, notes: event.target.value })} /></label>
        <button className="primary" disabled={!cart.items.length}>Place Order</button>
        {message && <p>{message}</p>}
        {message.startsWith("Order #") && <button type="button" onClick={() => go({ name: "orders" })}>View Orders</button>}
      </form>
      <aside className="summary">
        <h2>Summary</h2>
        <div className="checkout-items">
          {cart.items.map((item) => (
            <div key={item.id}>
              <span>{item.quantity} x {item.name}</span>
              <strong>${(Number(item.price) * Number(item.quantity)).toFixed(2)}</strong>
            </div>
          ))}
        </div>
        <strong>${Number(cart.total || 0).toFixed(2)}</strong>
        <button onClick={() => go({ name: "products" })}>Continue Shopping</button>
      </aside>
    </section>
  );
}
