const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const data = await response.json();
  if (!response.ok || data.success === false) {
    throw new Error(data.message || "Request failed");
  }
  return data;
}

export const api = {
  register: (payload) => request("/register.php", { method: "POST", body: JSON.stringify(payload) }),
  login: (payload) => request("/login.php", { method: "POST", body: JSON.stringify(payload) }),
  logout: () => request("/logout.php", { method: "POST" }),
  me: () => request("/me.php"),
  products: (search = "") => request(`/products.php${search ? `?search=${encodeURIComponent(search)}` : ""}`),
  product: (id) => request(`/products.php?id=${id}`),
  createProduct: (payload) => request("/products.php", { method: "POST", body: JSON.stringify(payload) }),
  updateProduct: (id, payload) => request(`/products.php?id=${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteProduct: (id) => request(`/products.php?id=${id}`, { method: "DELETE" }),
  cart: () => request("/cart.php"),
  addToCart: (productId, quantity = 1) => request("/cart.php", { method: "POST", body: JSON.stringify({ product_id: productId, quantity }) }),
  updateCart: (itemId, quantity) => request("/cart.php", { method: "PUT", body: JSON.stringify({ item_id: itemId, quantity }) }),
  removeCartItem: (itemId) => request("/cart.php", { method: "DELETE", body: JSON.stringify({ item_id: itemId }) }),
  checkout: (payload) => request("/orders.php", { method: "POST", body: JSON.stringify(payload) }),
  orders: () => request("/orders.php"),
  aiHistory: (sessionId) => request(`/ai.php?session_id=${encodeURIComponent(sessionId)}`),
  aiSessions: (sessionIds = []) => request(`/ai.php?sessions=1${sessionIds.length ? `&session_ids=${encodeURIComponent(sessionIds.join(","))}` : ""}`),
};
