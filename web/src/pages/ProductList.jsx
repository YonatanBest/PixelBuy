import { Cpu, Search, ShieldCheck, Sparkles, Truck } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../api/apiClient";
import ProductCard from "../components/ProductCard";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";

export default function ProductList({ go }) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [error, setError] = useState("");
  const { add } = useCart();
  const { user } = useAuth();

  const load = async (term = "") => {
    try {
      const res = await api.products(term);
      setProducts(res.data);
      setCategories(res.categories || []);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => { load(); }, []);

  const addProduct = async (id) => {
    if (!user) return go({ name: "login" });
    try {
      await add(id);
      setError("");
    } catch (err) {
      setError(err.message);
    }
  };

  const visibleProducts = category === "All"
    ? products
    : products.filter((product) => product.category_name === category);

  return (
    <section>
      <div className="store-hero">
        <div className="hero-copy">
          <span className="eyebrow">PixelBuy live tech store</span>
          <h1>Real devices. Smarter buys.</h1>
          <p>Shop phones, laptops, gaming gear, audio, cameras, and smart-home tech with Pixie, your live AI assistant for comparing specs, explaining tradeoffs, and building your cart.</p>
          <div className="hero-kickers">
            <span><Sparkles size={16} /> Pixie AI assistant</span>
            <span><Cpu size={16} /> Real specs</span>
            <span><Truck size={16} /> Demo checkout</span>
          </div>
        </div>
        <div className="hero-shop-panel">
          <strong>Find your next device</strong>
          <div className="search-box">
            <Search size={18} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => event.key === "Enter" && load(search)} placeholder="Search laptops, phones, audio..." />
            <button onClick={() => load(search)}>Search</button>
          </div>
          <div className="hero-pills">
            <button onClick={() => { setSearch("gaming laptop"); load("gaming laptop"); }}>Gaming laptops</button>
            <button onClick={() => { setSearch("headphones"); load("headphones"); }}>Headphones</button>
            <button onClick={() => { setSearch("phone"); load("phone"); }}>Phones</button>
          </div>
        </div>
      </div>
      <div className="market-strip">
        <div>
          <ShieldCheck size={20} />
          <span>Curated real-world products</span>
        </div>
        <div>
          <Cpu size={20} />
          <span>Spec-first comparisons</span>
        </div>
        <div>
          <Sparkles size={20} />
          <span>AI cart and review actions</span>
        </div>
      </div>
      <div className="category-strip">
        <button className={category === "All" ? "selected" : ""} onClick={() => setCategory("All")}>All</button>
        {categories.map((item) => (
          <button key={item.id} className={category === item.name ? "selected" : ""} onClick={() => setCategory(item.name)}>{item.name}</button>
        ))}
      </div>
      {error && <p className="error">{error}</p>}
      <div className="product-grid">
        {visibleProducts.map((product) => (
          <ProductCard key={product.id} product={product} onView={() => go({ name: "detail", id: product.id })} onAdd={() => addProduct(product.id)} />
        ))}
      </div>
    </section>
  );
}
