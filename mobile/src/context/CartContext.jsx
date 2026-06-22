import React, { createContext, useContext, useState } from "react";
import { api } from "../api/apiClient";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [cart, setCart] = useState({ items: [], total: 0 });

  const loadCart = async () => {
    const res = await api.cart();
    setCart(res.data);
  };

  const add = async (productId) => {
    const res = await api.addToCart(productId);
    setCart(res.data);
  };

  return <CartContext.Provider value={{ cart, setCart, loadCart, add }}>{children}</CartContext.Provider>;
}

export function useCart() {
  return useContext(CartContext);
}

