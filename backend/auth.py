import os
import re
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
import bcrypt
import jwt

from database import users_col

JWT_SECRET = os.getenv("JWT_SECRET", "changeme_secret_key")
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 24

bearer_scheme = HTTPBearer()

# ──────────────────────────────────────────────
# Pydantic request models
# ──────────────────────────────────────────────
class RegisterRequest(BaseModel):
    username: str
    password: str
    role: str = "PLAYER"   # PLAYER or ADMIN


class LoginRequest(BaseModel):
    username: str
    password: str

# ──────────────────────────────────────────────
# Validation
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
# JWT helpers
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
# Auth route handlers
# ──────────────────────────────────────────────
def register(body: RegisterRequest):
    validate_username(body.username)
    validate_password(body.password)

    role = body.role.upper()
    if role not in ("PLAYER", "ADMIN"):
        raise HTTPException(400, "Role must be PLAYER or ADMIN")

    if users_col.find_one({"username": body.username}):
        raise HTTPException(400, "Username already exists")

    hashed = bcrypt.hashpw(body.password.encode(), bcrypt.gensalt())
    users_col.insert_one({
        "username": body.username,
        "password": hashed.decode(),
        "role": role,
    })
    return {"message": "Registration successful"}


def login(body: LoginRequest):
    user = users_col.find_one({"username": body.username})
    if not user or not bcrypt.checkpw(body.password.encode(), user["password"].encode()):
        raise HTTPException(401, "Invalid username or password")

    token = create_token(str(user["_id"]), user["username"], user["role"])
    return {"token": token, "role": user["role"], "username": user["username"]}
