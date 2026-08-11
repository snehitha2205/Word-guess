import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")

client = MongoClient(MONGO_URI)
db = client["word_guess"]

users_col = db["users"]
words_col = db["words"]
games_col = db["games"]

# ──────────────────────────────────────────────
# Seed words (runs once on import; skips duplicates)
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
