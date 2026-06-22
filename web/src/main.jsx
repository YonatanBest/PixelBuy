import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import Navbar from "./components/Navbar";
import ProductList from "./pages/ProductList";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AdminProducts from "./pages/AdminProducts";
import Orders from "./pages/Orders";
import Profile from "./pages/Profile";
import AiAssistantWidget from "./components/AiAssistantWidget";
import "./styles.css";

function App() {
  const [route, setRoute] = useState({ name: "products" });

  const page = {
    products: <ProductList go={setRoute} />,
    detail: <ProductDetail id={route.id} go={setRoute} />,
    cart: <Cart go={setRoute} />,
    checkout: <Checkout go={setRoute} />,
    login: <Login go={setRoute} />,
    register: <Register go={setRoute} />,
    orders: <Orders go={setRoute} />,
    profile: <Profile go={setRoute} />,
    admin: <AdminProducts go={setRoute} />,
  }[route.name];

  return (
    <AuthProvider>
      <CartProvider>
        <Navbar go={setRoute} />
        <main className="app-shell">{page}</main>
        <AiAssistantWidget route={route.name} />
      </CartProvider>
    </AuthProvider>
  );
}

createRoot(document.getElementById("root")).render(<App />);
