import React, { useState } from "react";

export default function Register({ onGoLogin, apiFetch }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("PLAYER");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
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

      await fetchFunc("/auth/register", {
        method: "POST",
        body: JSON.stringify({ username, password, role }),
      });
      setSuccess("Registration successful! You can now login.");
      setUsername("");
      setPassword("");
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
        <h1 className="auth-title">Create your account</h1>
        <p className="auth-subtitle">Join and start guessing</p>
        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}
        <form onSubmit={handleRegister} className="auth-form">
          <div className="form-group">
            <label htmlFor="reg-username">
              Username <span className="hint">(min 5 chars)</span>
            </label>
            <input
              id="reg-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Choose a username"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="reg-password">
              Password <span className="hint">(min 5 chars, must include letter, number, $/%/*)</span>
            </label>
            <input
              id="reg-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Choose a password"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="reg-role">Role</label>
            <select id="reg-role" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="PLAYER">Player</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Registering…" : "Register"}
          </button>
        </form>
        <p className="auth-switch">
          Already have an account?{" "}
          <button type="button" className="link-btn" onClick={onGoLogin}>
            Login
          </button>
        </p>
      </div>
    </div>
  );
}
