import os
import re
import random
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from pymongo import MongoClient
from bson import ObjectId
import bcrypt
import jwt
from dotenv import load_dotenv

load_dotenv()

# ──────────────────────────────────────────────
# Config
# ──────────────────────────────────────────────
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
JWT_SECRET = os.getenv("JWT_SECRET", "changeme_secret_key")
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 24

client = MongoClient(MONGO_URI)
db = client["word_guess"]

users_col = db["users"]
words_col = db["words"]
games_col = db["games"]

app = FastAPI(title="Guess the Word API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

bearer_scheme = HTTPBearer()

# ──────────────────────────────────────────────
# Seed words on startup
# ──────────────────────────────────────────────
WORD_LIST = [
    "APPLE", "BRAVE", "CHAIR", "DANCE", "EARTH",
    "FLAME", "GRACE", "HAPPY", "INPUT", "JOKER",
    "KNEEL", "LIGHT", "MAGIC", "NIGHT", "OCEAN",
    "PILOT", "QUEEN", "RIVER", "STONE", "TIGER",
    "ULTRA", "VIVID", "WALTZ", "XENON", "YACHT",
]

def seed_words():
    for word in WORD_LIST:
        if not words_col.find_one({"word": word}):
            words_col.insert_one({"word": word})

seed_words()

# ──────────────────────────────────────────────
# Helper: JWT
# ──────────────────────────────────────────────
def create_token(user_id: str, username: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "username": username,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRY_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def get_current_user(creds: HTTPAuthorizationCredentials = Depends(bearer_scheme)) -> dict:
    return decode_token(creds.credentials)


def require_player(user: dict = Depends(get_current_user)) -> dict:
    if user["role"] != "PLAYER":
        raise HTTPException(status_code=403, detail="Players only")
    return user


def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user["role"] != "ADMIN":
        raise HTTPException(status_code=403, detail="Admins only")
    return user

# ──────────────────────────────────────────────
# Validation helpers
# ──────────────────────────────────────────────
def validate_username(username: str):
    if len(username) < 5:
        raise HTTPException(400, "Username must be at least 5 characters")


def validate_password(password: str):
    if len(password) < 5:
        raise HTTPException(400, "Password must be at least 5 characters")
    if not re.search(r"[a-zA-Z]", password):
        raise HTTPException(400, "Password must contain an alphabetic character")
    if not re.search(r"[0-9]", password):
        raise HTTPException(400, "Password must contain a numeric character")
    if not re.search(r"[$%*]", password):
        raise HTTPException(400, "Password must contain at least one of: $, %, *")

# ──────────────────────────────────────────────
# Word comparison logic (handles repeated letters)
# ──────────────────────────────────────────────
def evaluate_guess(answer: str, guess: str) -> list:
    result = [{"letter": ch, "status": "absent"} for ch in guess]
    answer_chars = list(answer)
    guess_chars = list(guess)

    # First pass: mark correct positions
    for i in range(5):
        if guess_chars[i] == answer_chars[i]:
            result[i]["status"] = "correct"
            answer_chars[i] = None  # consumed
            guess_chars[i] = None   # mark as handled

    # Second pass: mark wrong positions
    for i in range(5):
        if guess_chars[i] is None:
            continue
        if guess_chars[i] in answer_chars:
            result[i]["status"] = "wrong"
            answer_chars[answer_chars.index(guess_chars[i])] = None  # consume

    return result

# ──────────────────────────────────────────────
# Day boundary helper (UTC date string)
# ──────────────────────────────────────────────
def today_str() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")

# ──────────────────────────────────────────────
# Pydantic models
# ──────────────────────────────────────────────
class RegisterRequest(BaseModel):
    username: str
    password: str
    role: str = "PLAYER"   # PLAYER or ADMIN


class LoginRequest(BaseModel):
    username: str
    password: str


class GuessRequest(BaseModel):
    game_id: str
    guess: str

# ──────────────────────────────────────────────
# Auth endpoints
# ──────────────────────────────────────────────
@app.post("/api/auth/register")
def register(body: RegisterRequest):
    validate_username(body.username)
    validate_password(body.password)

    role = body.role.upper()
    if role not in ("PLAYER", "ADMIN"):
        raise HTTPException(400, "Role must be PLAYER or ADMIN")

    if users_col.find_one({"username": body.username}):
        raise HTTPException(400, "Username already exists")

    hashed = bcrypt.hashpw(body.password.encode(), bcrypt.gensalt())
    result = users_col.insert_one({
        "username": body.username,
        "password": hashed.decode(),
        "role": role,
    })
    return {"message": "Registration successful"}


@app.post("/api/auth/login")
def login(body: LoginRequest):
    user = users_col.find_one({"username": body.username})
    if not user or not bcrypt.checkpw(body.password.encode(), user["password"].encode()):
        raise HTTPException(401, "Invalid username or password")

    token = create_token(str(user["_id"]), user["username"], user["role"])
    return {"token": token, "role": user["role"], "username": user["username"]}

# ──────────────────────────────────────────────
# Game endpoints (Player)
# ──────────────────────────────────────────────
@app.post("/api/game/start")
def start_game(user: dict = Depends(require_player)):
    today = today_str()
    games_today = games_col.count_documents({
        "username": user["username"],
        "date": today,
    })
    if games_today >= 3:
        raise HTTPException(400, "Daily limit reached: maximum 3 games per day")

    word_doc = random.choice(list(words_col.find()))
    word = word_doc["word"]

    result = games_col.insert_one({
        "username": user["username"],
        "word": word,
        "guesses": [],
        "date": today,
        "won": False,
        "completed": False,
    })
    return {
        "game_id": str(result.inserted_id),
        "message": "Game started! Guess a 5-letter word.",
        "games_remaining": 2 - games_today,   # after this start
    }


@app.post("/api/game/guess")
def make_guess(body: GuessRequest, user: dict = Depends(require_player)):
    guess = body.guess.upper().strip()

    if len(guess) != 5:
        raise HTTPException(400, "Guess must be exactly 5 letters")
    if not guess.isalpha():
        raise HTTPException(400, "Guess must contain only letters")

    try:
        game_id = ObjectId(body.game_id)
    except Exception:
        raise HTTPException(400, "Invalid game ID")

    game = games_col.find_one({"_id": game_id, "username": user["username"]})
    if not game:
        raise HTTPException(404, "Game not found")
    if game["completed"]:
        raise HTTPException(400, "Game already completed")
    if len(game["guesses"]) >= 5:
        raise HTTPException(400, "Maximum guesses reached")

    feedback = evaluate_guess(game["word"], guess)
    won = all(f["status"] == "correct" for f in feedback)

    guesses = game["guesses"] + [{"guess": guess, "feedback": feedback}]
    completed = won or len(guesses) >= 5

    games_col.update_one(
        {"_id": game_id},
        {"$set": {"guesses": guesses, "won": won, "completed": completed}},
    )

    response = {
        "feedback": feedback,
        "won": won,
        "completed": completed,
        "attempts_used": len(guesses),
        "attempts_remaining": 5 - len(guesses),
    }
    if completed and not won:
        response["message"] = "Better luck next time"
    if won:
        response["message"] = "Congratulations! You guessed the word!"

    return response


@app.get("/api/game/history")
def game_history(user: dict = Depends(require_player)):
    today = today_str()
    games = list(games_col.find({"username": user["username"], "date": today}))
    result = []
    for g in games:
        result.append({
            "game_id": str(g["_id"]),
            "date": g["date"],
            "guesses": g["guesses"],
            "won": g["won"],
            "completed": g["completed"],
            "attempts_used": len(g["guesses"]),
        })
    games_today = len(games)
    return {
        "games": result,
        "games_today": games_today,
        "games_remaining": max(0, 3 - games_today),
    }

# ──────────────────────────────────────────────
# Admin endpoints
# ──────────────────────────────────────────────
@app.get("/api/admin/daily-report")
def daily_report(date: str, user: dict = Depends(require_admin)):
    # Validate date format
    try:
        datetime.strptime(date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(400, "Date must be in YYYY-MM-DD format")

    games = list(games_col.find({"date": date}))
    unique_players = len(set(g["username"] for g in games))
    correct_guesses = sum(1 for g in games if g["won"])

    return {
        "date": date,
        "users_played": unique_players,
        "correct_guesses": correct_guesses,
    }


@app.get("/api/admin/user-report/{username}")
def user_report(username: str, user: dict = Depends(require_admin)):
    if not users_col.find_one({"username": username}):
        raise HTTPException(404, f"User '{username}' not found")

    games = list(games_col.find({"username": username}))

    # Group by date
    by_date: dict = {}
    for g in games:
        d = g["date"]
        if d not in by_date:
            by_date[d] = {"date": d, "words_tried": 0, "correct_guesses": 0}
        by_date[d]["words_tried"] += 1
        if g["won"]:
            by_date[d]["correct_guesses"] += 1

    rows = sorted(by_date.values(), key=lambda x: x["date"], reverse=True)
    return {"username": username, "report": rows}
