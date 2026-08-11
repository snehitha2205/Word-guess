import random
from datetime import datetime, timezone

from fastapi import HTTPException, Depends
from pydantic import BaseModel
from bson import ObjectId

from database import words_col, games_col
from auth import require_player

# ──────────────────────────────────────────────
# Pydantic request model
# ──────────────────────────────────────────────
class GuessRequest(BaseModel):
    game_id: str
    guess: str

# ──────────────────────────────────────────────
# Day boundary helper (UTC date string)
# ──────────────────────────────────────────────
def today_str() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")

# ──────────────────────────────────────────────
# Word comparison (two-pass; handles repeated letters)
# ──────────────────────────────────────────────
def evaluate_guess(answer: str, guess: str) -> list:
    result = [{"letter": ch, "status": "absent"} for ch in guess]
    answer_chars = list(answer)
    guess_chars = list(guess)

    # First pass: correct position
    for i in range(5):
        if guess_chars[i] == answer_chars[i]:
            result[i]["status"] = "correct"
            answer_chars[i] = None   # consumed
            guess_chars[i] = None    # handled

    # Second pass: wrong position
    for i in range(5):
        if guess_chars[i] is None:
            continue
        if guess_chars[i] in answer_chars:
            result[i]["status"] = "wrong"
            answer_chars[answer_chars.index(guess_chars[i])] = None  # consume

    return result

# ──────────────────────────────────────────────
# Game route handlers
# ──────────────────────────────────────────────
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
