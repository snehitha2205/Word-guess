# Guess the Word 🔤

A full-stack word-guessing game (Wordle-style) built with React, FastAPI, and MongoDB.

Live link : https://word-guess-frontend-ozqv.onrender.com
---

## Features

- **Player**: Guess a hidden 5-letter word in up to 5 attempts; play up to 3 games per day
- **Admin**: View daily and per-user gameplay reports
- Green / Orange / Grey tile feedback with correct repeated-letter handling
- JWT authentication with password hashing (bcrypt)
- Role-based access control (PLAYER / ADMIN)

---

## Tech Stack

| Layer     | Technology              |
|-----------|-------------------------|
| Frontend  | React.js (CRA), CSS     |
| Backend   | Python, FastAPI         |
| Database  | MongoDB                 |
| Auth      | JWT + bcrypt            |

---

## Project Structure

```
word-guess/
│
├── backend/
│   ├── main.py              # FastAPI app & API setup
│   ├── auth.py              # Authentication & JWT
│   ├── database.py          # MongoDB connection
│   ├── game.py              # Game logic & game APIs
│   ├── admin.py             # Admin reports
│   ├── requirements.txt     # Python dependencies
│   └── .env                 # Environment variables
│
├── public/
│   └── logo.png             # Project logo
│
├── src/
│   ├── components/
│   │   ├── Login.jsx        # Login page
│   │   ├── Register.jsx     # Registration page
│   │   └── Game.jsx         # Player game
│   │
│   ├── App.js               # Main application
│   ├── App.css              # Application styling
│   └── index.js             # React entry point
│
├── package.json             # Frontend dependencies
├── .gitignore
└── README.md
```

> **Note:** The React app lives in the repository root (CRA default). The backend lives in `backend/`.

---

## MongoDB Setup

1. Install MongoDB Community Edition **or** use [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (free tier).
2. For a local install, start with:
   ```
   mongod
   ```
3. The app connects to `mongodb://localhost:27017` by default. Change `MONGO_URI` in `.env` for Atlas.

---

## Environment Variables

Create `backend/.env`:

```env
MONGO_URI=mongodb://localhost:27017
JWT_SECRET=your_super_secret_jwt_key_change_this
```

---

## Backend Setup

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate

pip install -r requirements.txt
```

The 25 seed words are inserted automatically the first time the server starts.

---

## Frontend Setup

```bash
# In the project root
npm install
```

---

## How to Run

**Terminal 1 – Backend**
```bash
cd backend
venv\Scripts\activate       # Windows
uvicorn main:app --reload --port 8000
```

**Terminal 2 – Frontend**
```bash
npm start
```

Open [http://localhost:3000](http://localhost:3000)

---

## Admin Account

Register through the UI and select **Admin** as the role, or use the register API directly:

```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username": "admin1", "password": "Admin1$", "role": "ADMIN"}'
```

Password rules: min 5 chars, must contain a letter, a number, and one of `$`, `%`, `*`.

---

## API Overview

| Method | Endpoint                           | Auth     | Description           |
|--------|------------------------------------|----------|-----------------------|
| POST   | `/api/auth/register`               | None     | Register user         |
| POST   | `/api/auth/login`                  | None     | Login, get JWT        |
| POST   | `/api/game/start`                  | Player   | Start a new game      |
| POST   | `/api/game/guess`                  | Player   | Submit a guess        |
| GET    | `/api/game/history`                | Player   | Today's game history  |
| GET    | `/api/admin/daily-report?date=...` | Admin    | Daily stats           |
| GET    | `/api/admin/user-report/{username}`| Admin    | Per-user stats        |

Interactive docs: [http://localhost:8000/docs](http://localhost:8000/docs)

---

## How to Test

1. **Register** a PLAYER account and an ADMIN account.
2. **Login** as player → start game → guess words → verify green/orange/grey tiles.
3. Play 3 games → confirm 4th is blocked ("Daily limit reached").
4. Make 5 wrong guesses → confirm "Better luck next time".
5. Login as admin → Daily Report for today → confirm user count and correct guesses.
6. Admin → User Report → enter player's username → confirm per-day breakdown.
7. Try accessing `/api/admin/daily-report` with a player token → should get 403.
