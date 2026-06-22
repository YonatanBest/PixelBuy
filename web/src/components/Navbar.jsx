import { ChevronDown, ClipboardList, LogIn, LogOut, Package, ShoppingCart, Shield, UserRound } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";

export default function Navbar({ go }) {
  const { user, logout } = useAuth();
  const { cart } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const cartCount = Number(cart?.item_count || 0);

  const navigate = (route) => {
    setMenuOpen(false);
    go(route);
  };

  const logoutAndClose = async () => {
    setMenuOpen(false);
    await logout();
    go({ name: "products" });
  };

  return (
    <header className="topbar">
      <button className="brand" onClick={() => go({ name: "products" })}>
        PixelBuy<span>.</span>
      </button>
      <nav>
        <button onClick={() => go({ name: "products" })}>
          <Package size={18} /> Products
        </button>
        <button className="cart-nav-button" onClick={() => go({ name: "cart" })}>
          <ShoppingCart size={18} /> Cart
          {cartCount > 0 && <span className="cart-count">{cartCount > 99 ? "99+" : cartCount}</span>}
        </button>
        {user?.role === "admin" && (
          <button onClick={() => go({ name: "admin" })}>
            <Shield size={18} /> Admin
          </button>
        )}
        {user ? (
          <div className="profile-menu">
            <button onClick={() => setMenuOpen((open) => !open)}>
              <UserRound size={18} /> {user.name} <ChevronDown size={16} />
            </button>
            {menuOpen && (
              <div className="profile-dropdown">
                <button onClick={() => navigate({ name: "profile" })}>
                  <UserRound size={16} /> Profile
                </button>
                <button onClick={() => navigate({ name: "orders" })}>
                  <ClipboardList size={16} /> Orders
                </button>
                <button onClick={logoutAndClose}>
                  <LogOut size={16} /> Logout
                </button>
              </div>
            )}
          </div>
        ) : (
          <button onClick={() => go({ name: "login" })}>
            <LogIn size={18} /> Login
          </button>
        )}
      </nav>
    </header>
  );
}
