import Constants from "expo-constants";
import { Platform } from "react-native";

function isLoopbackHost(value) {
  return /(^|:\/\/)(localhost|127\.0\.0\.1|10\.0\.2\.2)(:\d+)?(\/|$)/i.test(value);
}

function resolveApiBase() {
  const envBase = process.env.EXPO_PUBLIC_API_BASE;

  if (Platform.OS === "web" && typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:8000`;
  }
  if (envBase && !isLoopbackHost(envBase)) {
    return envBase.replace(/\/$/, "");
  }

  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const host = hostUri.split(":")[0];
    return `http://${host}:8000`;
  }

  return Platform.OS === "android" ? "http://10.0.2.2:8000" : "http://127.0.0.1:8000";
}

function resolveHost() {
  const envBase = process.env.EXPO_PUBLIC_API_BASE;

  if (Platform.OS === "web" && typeof window !== "undefined") {
    return window.location.hostname;
  }

  if (envBase && !isLoopbackHost(envBase)) {
    try {
      return new URL(envBase).hostname;
    } catch {
      return envBase.replace(/^https?:\/\//i, "").split(":")[0].split("/")[0];
    }
  }

  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    return hostUri.split(":")[0];
  }

  return Platform.OS === "android" ? "10.0.2.2" : "127.0.0.1";
}

const API_BASE = resolveApiBase();
let userId = null;

export function setApiUserId(id) {
  userId = id;
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(userId ? { "X-User-Id": String(userId) } : {}), ...(options.headers || {}) },
    ...options,
  });
  const data = await response.json();
  if (!response.ok || data.success === false) {
    throw new Error(data.message || "Request failed");
  }
  return data;
}

export const api = {
  login: (payload) => request("/login.php", { method: "POST", body: JSON.stringify(payload) }),
  register: (payload) => request("/register.php", { method: "POST", body: JSON.stringify(payload) }),
  logout: () => request("/logout.php", { method: "POST" }),
  products: (search = "") => request(`/products.php${search ? `?search=${encodeURIComponent(search)}` : ""}`),
  product: (id) => request(`/products.php?id=${id}`),
  cart: () => request("/cart.php"),
  addToCart: (productId, quantity = 1) => request("/cart.php", { method: "POST", body: JSON.stringify({ product_id: productId, quantity }) }),
  updateCart: (itemId, quantity) => request("/cart.php", { method: "PUT", body: JSON.stringify({ item_id: itemId, quantity }) }),
  removeCartItem: (itemId) => request("/cart.php", { method: "DELETE", body: JSON.stringify({ item_id: itemId }) }),
  checkout: (payload) => request("/orders.php", { method: "POST", body: JSON.stringify(payload) }),
  orders: () => request("/orders.php"),
  aiHistory: (sessionId) => request(`/ai.php?session_id=${encodeURIComponent(sessionId)}`),
  aiSessions: (sessionIds = []) => request(`/ai.php?sessions=1${sessionIds.length ? `&session_ids=${encodeURIComponent(sessionIds.join(","))}` : ""}`),
};

export function resolveLiveWsUrl(path = "/ws") {
  const host = resolveHost();
  const envUrl = process.env.EXPO_PUBLIC_LIVE_WS_URL;
  if (envUrl && !isLoopbackHost(envUrl)) {
    return envUrl.replace(/\/$/, "");
  }

  const protocol = Platform.OS === "web" && typeof window !== "undefined" && window.location.protocol === "https:" ? "wss" : "ws";
  return `${protocol}://${host}:8765${path}`;
}

export function resolveMediaUrl(value) {
  if (!value) {
    return value;
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  return `${API_BASE}${value.startsWith("/") ? value : `/${value}`}`;
}
