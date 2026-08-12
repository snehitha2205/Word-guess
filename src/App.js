import React, { useState, useEffect } from "react";
import "./App.css";

const API = "https://word-guess-backend-t7tg.onrender.com/api";

// ──────────────────────────────────────────────
// Auth helpers
// ──────────────────────────────────────────────
function getToken() {
  return localStorage.getItem("token");
}

async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Request failed");
  return data;
}

// ──────────────────────────────────────────────
// Login Page
// ──────────────────────────────────────────────
function LoginPage({ onLogin, onGoRegister }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await apiFetch("/auth/login", {
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

// ──────────────────────────────────────────────
// Register Page
// ──────────────────────────────────────────────
function RegisterPage({ onGoLogin }) {
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
      await apiFetch("/auth/register", {
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

// ──────────────────────────────────────────────
// Letter Tile
// ──────────────────────────────────────────────
function Tile({ letter, status }) {
  return (
    <div className={`tile tile-${status}`}>
      {letter}
    </div>
  );
}

// ──────────────────────────────────────────────
// Player Game Page
// ──────────────────────────────────────────────
function GamePage({ onLogout }) {
  const username = localStorage.getItem("username");

  const [gamesRemaining, setGamesRemaining] = useState(null);
  const [gameId, setGameId] = useState(null);
  const [guesses, setGuesses] = useState([]);
  const [currentGuess, setCurrentGuess] = useState("");
  const [attemptsRemaining, setAttemptsRemaining] = useState(5);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    try {
      const data = await apiFetch("/game/history");
      setGamesRemaining(data.games_remaining);

      const active = data.games.find((g) => !g.completed);
      if (active) {
        setGameId(active.game_id);
        setGuesses(active.guesses);
        setAttemptsRemaining(5 - active.attempts_used);
        setGameOver(false);
        setWon(false);
      } else {
        const last = data.games[data.games.length - 1];
        if (last && last.completed) {
          setGuesses(last.guesses);
          setAttemptsRemaining(0);
          setGameOver(true);
          setWon(last.won);
        }
      }
    } catch (err) {
      setError(err.message);
    }
    setInitialized(true);
  }

  async function startGame() {
    setError("");
    setLoading(true);
    try {
      const data = await apiFetch("/game/start", { method: "POST" });
      setGameId(data.game_id);
      setGuesses([]);
      setAttemptsRemaining(5);
      setGameOver(false);
      setWon(false);
      setMessage("");
      setCurrentGuess("");
      setGamesRemaining((prev) => (prev !== null ? prev - 1 : null));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function submitGuess(e) {
    e.preventDefault();
    if (!currentGuess || currentGuess.length !== 5) {
      setError("Guess must be exactly 5 letters");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const data = await apiFetch("/game/guess", {
        method: "POST",
        body: JSON.stringify({ game_id: gameId, guess: currentGuess }),
      });

      setGuesses((prev) => [
        ...prev,
        { guess: currentGuess.toUpperCase(), feedback: data.feedback },
      ]);
      setAttemptsRemaining(data.attempts_remaining);
      setCurrentGuess("");

      if (data.completed) {
        setGameOver(true);
        setWon(data.won);
        setMessage(data.message);
        setShowDialog(true);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleDialogOk() {
    setShowDialog(false);
    loadHistory();
  }

  if (!initialized) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
        <span>Loading...</span>
      </div>
    );
  }

  return (
    <div className="game-container">
      {/* Header */}
      <header className="game-header">
        <div className="header-left">
          <img src="/logo.png" alt="Logo" className="header-logo-img" />
        </div>
        <div className="header-right">
          <div className="header-user">
            <span className="user-icon">👤</span>
            <span className="username-text">{username}</span>
          </div>
          <button className="btn btn-secondary btn-logout" onClick={onLogout}>
            Logout
          </button>
        </div>
      </header>

      <main className="game-main">
        {/* Page Title */}
        <div className="page-heading">
          <h1 className="page-title">Your Game</h1>
        </div>

        {/* Stats bar */}
        <div className="stats-bar">
          <div className="stat-card">
            <span className="stat-label">Words Remaining Today</span>
            <span className="stat-value">{gamesRemaining !== null ? gamesRemaining : "—"}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Attempts Remaining</span>
            <span className="stat-value">{gameId && !gameOver ? attemptsRemaining : "—"}</span>
          </div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {/* No active game */}
        {!gameId && (
          <div className="no-game-card">
            <p className="no-game-text">
              {gamesRemaining === 0
                ? "You've used all 3 games for today. Come back tomorrow!"
                : "Start a new game to begin guessing!"}
            </p>
            {gamesRemaining > 0 && (
              <button className="btn btn-primary btn-start" onClick={startGame} disabled={loading}>
                {loading ? "Starting…" : "Start Game"}
              </button>
            )}
          </div>
        )}

        {/* Active game */}
        {gameId && (
          <div className="board-container">
            {/* Previous guesses */}
            <div className="guesses-grid">
              {guesses.map((g, i) => (
                <div key={i} className="guess-row">
                  {g.feedback.map((f, j) => (
                    <Tile key={j} letter={f.letter} status={f.status} />
                  ))}
                </div>
              ))}
              {/* Empty rows */}
              {!gameOver &&
                Array.from({ length: 5 - guesses.length }).map((_, i) => (
                  <div key={`empty-${i}`} className="guess-row">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <div key={j} className="tile tile-empty" />
                    ))}
                  </div>
                ))}
            </div>

            {/* Input form */}
            {!gameOver && (
              <form onSubmit={submitGuess} className="guess-form">
                <input
                  type="text"
                  value={currentGuess}
                  onChange={(e) => setCurrentGuess(e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 5))}
                  placeholder="Enter 5-letter word"
                  className="guess-input"
                  maxLength={5}
                  disabled={loading}
                  autoFocus
                />
                <button type="submit" className="btn btn-primary btn-guess" disabled={loading || currentGuess.length !== 5}>
                  {loading ? "Checking…" : "Guess"}
                </button>
              </form>
            )}

            {/* Post game actions */}
            {gameOver && gamesRemaining > 0 && (
              <div className="game-end">
                <button className="btn btn-primary btn-start" onClick={startGame} disabled={loading}>
                  {loading ? "Starting…" : "Start New Game"}
                </button>
              </div>
            )}
            {gameOver && gamesRemaining === 0 && (
              <div className="game-end">
                <p className="no-game-text">No more games today. Come back tomorrow!</p>
              </div>
            )}
          </div>
        )}

        {/* Legend */}
        <div className="legend-card">
          <div className="legend-item">
            <div className="tile tile-correct tile-legend">A</div>
            <span>Correct position</span>
          </div>
          <div className="legend-item">
            <div className="tile tile-wrong tile-legend">B</div>
            <span>Wrong position</span>
          </div>
          <div className="legend-item">
            <div className="tile tile-absent tile-legend">C</div>
            <span>Not in word</span>
          </div>
        </div>
      </main>

      {/* Result dialog */}
      {showDialog && (
        <div className="dialog-overlay">
          <div className="dialog-card">
            <div className="dialog-icon">{won ? "🎉" : "😢"}</div>
            <p className="dialog-message">{message}</p>
            <button className="btn btn-primary btn-dialog" onClick={handleDialogOk}>
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// Admin Dashboard
// ──────────────────────────────────────────────
function AdminPage({ onLogout }) {
  const username = localStorage.getItem("username");

  const [activeTab, setActiveTab] = useState("daily");

  const [reportDate, setReportDate] = useState(new Date().toISOString().slice(0, 10));
  const [dailyResult, setDailyResult] = useState(null);
  const [dailyError, setDailyError] = useState("");
  const [dailyLoading, setDailyLoading] = useState(false);

  const [reportUser, setReportUser] = useState("");
  const [userResult, setUserResult] = useState(null);
  const [userError, setUserError] = useState("");
  const [userLoading, setUserLoading] = useState(false);

  async function fetchDailyReport(e) {
    e.preventDefault();
    setDailyError("");
    setDailyResult(null);
    setDailyLoading(true);
    try {
      const data = await apiFetch(`/admin/daily-report?date=${reportDate}`);
      setDailyResult(data);
    } catch (err) {
      setDailyError(err.message);
    } finally {
      setDailyLoading(false);
    }
  }

  async function fetchUserReport(e) {
    e.preventDefault();
    setUserError("");
    setUserResult(null);
    setUserLoading(true);
    try {
      const data = await apiFetch(`/admin/user-report/${reportUser}`);
      setUserResult(data);
    } catch (err) {
      setUserError(err.message);
    } finally {
      setUserLoading(false);
    }
  }

  return (
    <div className="admin-container">
      {/* Header */}
      <header className="game-header">
        <div className="header-left">
          <img src="/logo.png" alt="Logo" className="header-logo-img" />
        </div>
        <div className="header-right">
          <div className="header-user">
            <span className="user-icon">👤</span>
            <span className="username-text">{username}</span>
          </div>
          <button className="btn btn-secondary btn-logout" onClick={onLogout}>
            Logout
          </button>
        </div>
      </header>

      <main className="admin-main">
        {/* Title */}
        <div className="page-heading">
          <h1 className="page-title">Admin Dashboard</h1>
          <p className="page-subtitle">Monitor game activity and player statistics</p>
        </div>

        {/* Tabs */}
        <div className="admin-tabs">
          <button
            type="button"
            className={`admin-tab-btn ${activeTab === "daily" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("daily")}
          >
            📅 Daily Report
          </button>
          <button
            type="button"
            className={`admin-tab-btn ${activeTab === "user" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("user")}
          >
            👤 User Report
          </button>
        </div>

        {/* Daily Report */}
        {activeTab === "daily" && (
          <div className="report-section">
            <div className="section-card">
              <h2 className="section-title">Daily Report</h2>
              <p className="section-desc">View gameplay statistics for a specific date.</p>
              {dailyError && <div className="alert alert-error">{dailyError}</div>}
              <form onSubmit={fetchDailyReport} className="report-form">
                <div className="form-group">
                  <label htmlFor="daily-date">Select Date</label>
                  <input
                    id="daily-date"
                    type="date"
                    value={reportDate}
                    onChange={(e) => setReportDate(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className="btn btn-primary" disabled={dailyLoading}>
                  {dailyLoading ? "Loading…" : "Get Report"}
                </button>
              </form>

              {dailyResult && (
                <div className="report-result">
                  <h3 className="result-title">Results for {dailyResult.date}</h3>
                  <div className="report-cards">
                    <div className="report-stat-card">
                      <div className="report-stat-value">{dailyResult.users_played}</div>
                      <div className="report-stat-label">Users Played</div>
                    </div>
                    <div className="report-stat-card">
                      <div className="report-stat-value">{dailyResult.correct_guesses}</div>
                      <div className="report-stat-label">Correct Guesses (Words Won)</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* User Report */}
        {activeTab === "user" && (
          <div className="report-section">
            <div className="section-card">
              <h2 className="section-title">User Report</h2>
              <p className="section-desc">View detailed game history for a specific player.</p>
              {userError && <div className="alert alert-error">{userError}</div>}
              <form onSubmit={fetchUserReport} className="report-form">
                <div className="form-group">
                  <label htmlFor="user-search">Username</label>
                  <input
                    id="user-search"
                    type="text"
                    value={reportUser}
                    onChange={(e) => setReportUser(e.target.value)}
                    placeholder="Enter username"
                    required
                  />
                </div>
                <button type="submit" className="btn btn-primary" disabled={userLoading}>
                  {userLoading ? "Loading…" : "Get Report"}
                </button>
              </form>

              {userResult && (
                <div className="report-result">
                  <h3 className="result-title">Report for: {userResult.username}</h3>
                  {userResult.report.length === 0 ? (
                    <p className="no-data-msg">No games played yet.</p>
                  ) : (
                    <div className="table-wrapper">
                      <table className="report-table">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Words Tried</th>
                            <th>Correct Guesses</th>
                          </tr>
                        </thead>
                        <tbody>
                          {userResult.report.map((row, i) => (
                            <tr key={i}>
                              <td>{row.date}</td>
                              <td>{row.words_tried}</td>
                              <td>{row.correct_guesses}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ──────────────────────────────────────────────
// App Root
// ──────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState("login");

  useEffect(() => {
    const token = getToken();
    const storedRole = localStorage.getItem("role");
    if (token && storedRole) {
      setPage(storedRole === "ADMIN" ? "admin" : "game");
    }
  }, []);

  function handleLogin(userRole) {
    setPage(userRole === "ADMIN" ? "admin" : "game");
  }

  function handleLogout() {
    localStorage.clear();
    setPage("login");
  }

  if (page === "register") return <RegisterPage onGoLogin={() => setPage("login")} />;
  if (page === "game") return <GamePage onLogout={handleLogout} />;
  if (page === "admin") return <AdminPage onLogout={handleLogout} />;

  return (
    <LoginPage
      onLogin={handleLogin}
      onGoRegister={() => setPage("register")}
    />
  );
}

