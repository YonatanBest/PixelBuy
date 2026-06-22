import { AlertTriangle, Boxes, ClipboardList, PackagePlus, Pencil, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api } from "../api/apiClient";
import { useAuth } from "../context/AuthContext";

const blank = {
  name: "",
  brand: "",
  model_number: "",
  category_id: 1,
  description: "",
  price: "",
  original_price: "",
  stock: "",
  image_url: "",
  product_url: "",
  warranty: "",
  shipping_note: "",
};

export default function AdminProducts({ go }) {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [orders, setOrders] = useState([]);
  const [form, setForm] = useState(blank);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState("");
  const stats = useMemo(() => {
    const totalStock = products.reduce((sum, product) => sum + Number(product.stock || 0), 0);
    const outOfStock = products.filter((product) => Number(product.stock || 0) <= 0).length;
    const lowStock = products.filter((product) => Number(product.stock || 0) > 0 && Number(product.stock || 0) <= 5).length;

    return { totalProducts: products.length, totalStock, outOfStock, lowStock };
  }, [products]);

  const load = async () => {
    const res = await api.products();
    setProducts(res.data);
    setCategories(res.categories || []);
    if (user?.role === "admin") {
      const orderRes = await api.orders();
      setOrders(orderRes.data || []);
    }
  };

  useEffect(() => {
    if (user?.role === "admin") load();
  }, [user?.id]);

  const submit = async (event) => {
    event.preventDefault();
    try {
      if (editingId) {
        await api.updateProduct(editingId, form);
        setMessage("Product updated.");
      } else {
        await api.createProduct(form);
        setMessage("Product created.");
      }
      setForm(blank);
      setEditingId(null);
      load();
    } catch (err) {
      setMessage(err.message);
    }
  };

  const edit = (product) => {
    setEditingId(product.id);
    setForm({
      name: product.name,
      brand: product.brand || "",
      model_number: product.model_number || "",
      category_id: product.category_id || 1,
      description: product.description || "",
      price: product.price,
      original_price: product.original_price || "",
      stock: product.stock,
      image_url: product.image_url || "",
      product_url: product.product_url || "",
      warranty: product.warranty || "",
      shipping_note: product.shipping_note || "",
    });
  };

  const remove = async (id) => {
    await api.deleteProduct(id);
    load();
  };

  if (!user || user.role !== "admin") {
    return <section className="empty-state"><h1>Admin access required</h1><button className="primary" onClick={() => go({ name: "login" })}>Login</button></section>;
  }

  return (
    <section>
      <div className="page-heading">
        <div>
          <span className="eyebrow">Admin</span>
          <h1>Inventory Control</h1>
          <p>Track stock, sold-out products, and recent orders from one workspace.</p>
        </div>
      </div>
      <div className="admin-stats">
        <div><Boxes size={22} /><span>Products</span><strong>{stats.totalProducts}</strong></div>
        <div><PackagePlus size={22} /><span>Stock units</span><strong>{stats.totalStock}</strong></div>
        <div><AlertTriangle size={22} /><span>Low stock</span><strong>{stats.lowStock}</strong></div>
        <div><ClipboardList size={22} /><span>Orders</span><strong>{orders.length}</strong></div>
      </div>
      <div className="admin-layout">
        <form className="form-card" onSubmit={submit}>
          <h1>{editingId ? "Edit Product" : "New Product"}</h1>
          {message && <p>{message}</p>}
          <div className="form-grid">
            <label>Name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
            <label>Brand<input value={form.brand} onChange={(event) => setForm({ ...form, brand: event.target.value })} /></label>
          </div>
          <div className="form-grid">
            <label>Model<input value={form.model_number} onChange={(event) => setForm({ ...form, model_number: event.target.value })} /></label>
            <label>Category<select value={form.category_id} onChange={(event) => setForm({ ...form, category_id: event.target.value })}>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
          </div>
          <label>Description<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
          <div className="form-grid">
            <label>Price<input type="number" min="0" step="0.01" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} /></label>
            <label>Original price<input type="number" min="0" step="0.01" value={form.original_price} onChange={(event) => setForm({ ...form, original_price: event.target.value })} /></label>
            <label>Stock<input type="number" min="0" value={form.stock} onChange={(event) => setForm({ ...form, stock: event.target.value })} /></label>
          </div>
          <label>Image URL<input value={form.image_url} onChange={(event) => setForm({ ...form, image_url: event.target.value })} /></label>
          <label>Product URL<input value={form.product_url} onChange={(event) => setForm({ ...form, product_url: event.target.value })} /></label>
          <div className="form-grid">
            <label>Warranty<input value={form.warranty} onChange={(event) => setForm({ ...form, warranty: event.target.value })} /></label>
            <label>Shipping note<input value={form.shipping_note} onChange={(event) => setForm({ ...form, shipping_note: event.target.value })} /></label>
          </div>
          <div className="form-actions">
            <button className="primary">{editingId ? "Update" : "Create"} Product</button>
            {editingId && <button type="button" onClick={() => { setEditingId(null); setForm(blank); }}>Cancel</button>}
          </div>
        </form>
        <div className="admin-side">
          <section>
            <h2>Products</h2>
            <div className="admin-list">
              {products.map((product) => {
                const stock = Number(product.stock || 0);
                return (
                  <article key={product.id} className="admin-row">
                    <img src={product.image_url} alt={product.name} />
                    <div>
                      <strong>{product.name}</strong>
                      <span>{product.category_name} · ${Number(product.price).toFixed(2)}</span>
                    </div>
                    <span className={stock <= 0 ? "stock-text out" : stock <= 5 ? "stock-text low" : "stock-text"}>{stock <= 0 ? "Out" : `${stock} left`}</span>
                    <button onClick={() => edit(product)}><Pencil size={16} /> Edit</button>
                    <button onClick={() => remove(product.id)}><Trash2 size={16} /> Delete</button>
                  </article>
                );
              })}
            </div>
          </section>
          <section>
            <h2>Recent Orders</h2>
            <div className="admin-orders">
              {orders.slice(0, 5).map((order) => (
                <article className="admin-order" key={order.id}>
                  <div>
                    <strong>#{order.id} · {order.customer_name || order.user_name}</strong>
                    <span>{(order.items || []).map((item) => `${item.quantity} x ${item.name}`).join(", ")}</span>
                  </div>
                  <strong>${Number(order.total || 0).toFixed(2)}</strong>
                </article>
              ))}
              {!orders.length && <p>No orders yet.</p>}
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}
