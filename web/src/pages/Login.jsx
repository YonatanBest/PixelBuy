import { useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function Login({ go }) {
  const { login } = useAuth();
  const [email, setEmail] = useState("student@smartshop.test");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    try {
      await login(email, password);
      go({ name: "products" });
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section className="form-page">
      <form className="form-card" onSubmit={submit}>
        <h1>Login</h1>
        {error && <p className="error">{error}</p>}
        <label>Email<input value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        <button className="primary">Login</button>
        <button type="button" onClick={() => go({ name: "register" })}>Create account</button>
      </form>
    </section>
  );
}

