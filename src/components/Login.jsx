import React, { useState } from "react";

export default function Login({ onLogin, onGoRegister, apiFetch }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const fetchFunc = apiFetch || (async (path, options = {}) => {
        const token = localStorage.getItem("token");
        const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
        if (token) headers["Authorization"] = `Bearer ${token}`;
        const res = await fetch(`https://word-guess-backend-t7tg.onrender.com/api${path}`, { ...options, headers });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Request failed");
        return data;
      });

      const data = await fetchFunc("/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      localStorage.setItem("token", data.token);
      localStorage.setItem("role", data.role);
      localStorage.setItem("username", data.username);
      onLogin(data.role);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo-wrapper">
          <img src="/logo.png" alt="Logo" className="auth-logo-img" />
        </div>
        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-subtitle">Sign in to continue</p>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleLogin} className="auth-form">
          <div className="form-group">
            <label htmlFor="login-username">Username</label>
            <input
              id="login-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              required
              autoFocus
            />
          </div>
          <div className="form-group">
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Logging in…" : "Login"}
          </button>
        </form>
        <p className="auth-switch">
          Don't have an account?{" "}
          <button type="button" className="link-btn" onClick={onGoRegister}>
            Register
          </button>
        </p>
      </div>
    </div>
  );
}
