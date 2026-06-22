import React, { createContext, useContext, useState } from "react";
import { api, setApiUserId } from "../api/apiClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  const login = async (email, password) => {
    const res = await api.login({ email, password });
    setUser(res.data);
    setApiUserId(res.data.id);
  };

  const register = async (name, email, password) => {
    const res = await api.register({ name, email, password });
    setUser(res.data);
    setApiUserId(res.data.id);
  };

  const logout = async () => {
    try {
      await api.logout();
    } finally {
      setUser(null);
      setApiUserId(null);
    }
  };

  return <AuthContext.Provider value={{ user, login, register, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
