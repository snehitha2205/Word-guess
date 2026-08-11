from datetime import datetime

from fastapi import HTTPException, Depends

from database import users_col, games_col
from auth import require_admin

# ──────────────────────────────────────────────
# Admin report handlers
# ──────────────────────────────────────────────
def daily_report(date: str, user: dict = Depends(require_admin)):
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
