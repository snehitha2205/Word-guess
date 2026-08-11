import React, { useState } from "react";
import { apiFetch } from "../api";

// Small helper kept inside this file — not worth a separate file
function Tile({ letter, status }) {
  return <div className={`tile tile-${status}`}>{letter}</div>;
}

export default function Game({ onLogout }) {
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

  // Load today's history on mount
  React.useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    try {
      const data = await apiFetch("/game/history");
      setGamesRemaining(data.games_remaining);

      // Resume an active (incomplete) game if one exists
      const active = data.games.find((g) => !g.completed);
      if (active) {
        setGameId(active.game_id);
        setGuesses(active.guesses);
        setAttemptsRemaining(5 - active.attempts_used);
        setGameOver(false);
        setWon(false);
      } else {
        // Show the last completed game's board
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
    return <div className="loading">Loading…</div>;
  }

  return (
    <div className="game-container">
      {/* Header */}
      <header className="game-header">
        <div className="header-left">
          <img src="/logo.png" alt="logo" className="header-logo-img" />
          <span className="header-title">Guess the Word</span>
        </div>
        <div className="header-right">
          <span className="header-user">👤 {username}</span>
          <button className="btn btn-secondary" onClick={onLogout}>
            Logout
          </button>
        </div>
      </header>

      <main className="game-main">
        {/* Stats bar */}
        <div className="stats-bar">
          <div className="stat-item">
            <span className="stat-label">Games Left Today</span>
            <span className="stat-value">{gamesRemaining !== null ? gamesRemaining : "—"}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Attempts Remaining</span>
            <span className="stat-value">{gameId && !gameOver ? attemptsRemaining : "—"}</span>
          </div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {/* No active game */}
        {!gameId && (
          <div className="no-game">
            <p>
              {gamesRemaining === 0
                ? "You've used all 3 games for today. Come back tomorrow!"
                : "Start a new game to begin guessing!"}
            </p>
            {gamesRemaining > 0 && (
              <button className="btn btn-primary" onClick={startGame} disabled={loading}>
                {loading ? "Starting…" : "Start Game"}
              </button>
            )}
          </div>
        )}

        {/* Active game */}
        {gameId && (
          <>
            {/* Guess grid */}
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

            {/* Input */}
            {!gameOver && (
              <form onSubmit={submitGuess} className="guess-form">
                <input
                  type="text"
                  value={currentGuess}
                  onChange={(e) =>
                    setCurrentGuess(
                      e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 5)
                    )
                  }
                  placeholder="Type your 5-letter guess"
                  className="guess-input"
                  maxLength={5}
                  disabled={loading}
                  autoFocus
                />
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading || currentGuess.length !== 5}
                >
                  {loading ? "Checking…" : "Guess"}
                </button>
              </form>
            )}

            {/* Post-game actions */}
            {gameOver && gamesRemaining > 0 && (
              <div className="game-end">
                <button className="btn btn-primary" onClick={startGame} disabled={loading}>
                  {loading ? "Starting…" : "Start New Game"}
                </button>
              </div>
            )}
            {gameOver && gamesRemaining === 0 && (
              <div className="game-end">
                <p>No more games today. Come back tomorrow!</p>
              </div>
            )}
          </>
        )}

        {/* Legend */}
        <div className="legend">
          <div className="legend-item">
            <div className="tile tile-correct">A</div>
            <span>Correct position</span>
          </div>
          <div className="legend-item">
            <div className="tile tile-wrong">B</div>
            <span>Wrong position</span>
          </div>
          <div className="legend-item">
            <div className="tile tile-absent">C</div>
            <span>Not in word</span>
          </div>
        </div>
      </main>

      {/* Result dialog */}
      {showDialog && (
        <div className="dialog-overlay">
          <div className="dialog">
            <div className="dialog-icon">{won ? "🎉" : "😢"}</div>
            <p className="dialog-message">{message}</p>
            <button className="btn btn-primary" onClick={handleDialogOk}>
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
