from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import seed_words
import auth
import game
import admin

app = FastAPI(title="Guess the Word API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://word-guess-frontend-ozqv.onrender.com",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Seed words on startup ──────────────────────
seed_words()

# ── Auth routes ────────────────────────────────
app.post("/api/auth/register")(auth.register)
app.post("/api/auth/login")(auth.login)

# ── Game routes ────────────────────────────────
app.post("/api/game/start")(game.start_game)
app.post("/api/game/guess")(game.make_guess)
app.get("/api/game/history")(game.game_history)

# ── Admin routes ───────────────────────────────
app.get("/api/admin/daily-report")(admin.daily_report)
app.get("/api/admin/user-report/{username}")(admin.user_report)
