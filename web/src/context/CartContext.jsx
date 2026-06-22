import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../api/apiClient";
import { useAuth } from "./AuthContext";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { user } = useAuth();
  const [cart, setCart] = useState({ items: [], total: 0, item_count: 0 });

  const loadCart = async () => {
    const res = await api.cart();
    setCart(normalizeCart(res.data));
  };

  useEffect(() => {
    if (user) {
      loadCart().catch(() => setCart({ items: [], total: 0, item_count: 0 }));
    } else {
      setCart({ items: [], total: 0, item_count: 0 });
    }
  }, [user?.id]);

  const add = async (productId) => {
    const res = await api.addToCart(productId);
    setCart(normalizeCart(res.data));
  };

  const update = async (itemId, quantity) => {
    const res = await api.updateCart(itemId, quantity);
    setCart(normalizeCart(res.data));
  };

  const remove = async (itemId) => {
    const res = await api.removeCartItem(itemId);
    setCart(normalizeCart(res.data));
  };

  const value = useMemo(() => ({ cart, loadCart, add, update, remove, setCart }), [cart]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  return useContext(CartContext);
}

function normalizeCart(cart) {
  const items = cart?.items || [];
  const itemCount = cart?.item_count ?? items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);

  return {
    cart_id: cart?.cart_id,
    items,
    total: Number(cart?.total || 0),
    item_count: itemCount,
  };
}
