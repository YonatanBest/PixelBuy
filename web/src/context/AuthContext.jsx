import { createContext, useContext, useEffect, useState } from "react";
import { api, getRememberedAuthUser, rememberAuthUser } from "../api/apiClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getRememberedAuthUser());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.me()
      .then((res) => {
        rememberAuthUser(res.data);
        setUser(res.data);
      })
      .catch(() => {
        rememberAuthUser(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const res = await api.login({ email, password });
    rememberAuthUser(res.data);
    setUser(res.data);
  };

  const register = async (name, email, password) => {
    const res = await api.register({ name, email, password });
    rememberAuthUser(res.data);
    setUser(res.data);
  };

  const logout = async () => {
    await api.logout().catch(() => {});
    rememberAuthUser(null);
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, loading, login, register, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

