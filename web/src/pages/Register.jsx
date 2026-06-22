import { useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function Register({ go }) {
  const { register } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    try {
      await register(form.name, form.email, form.password);
      go({ name: "products" });
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section className="form-page">
      <form className="form-card" onSubmit={submit}>
        <h1>Register</h1>
        {error && <p className="error">{error}</p>}
        <label>Name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
        <label>Email<input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
        <label>Password<input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label>
        <button className="primary">Register</button>
      </form>
    </section>
  );
}

