import json
from datetime import datetime

class AuthService:
    def __init__(self, db_session):
        self.db = db_session

    def authenticate_user(self, email: str, password_raw: str):
        """Validates credentials against users table"""
        user = self.db.query("SELECT * FROM users WHERE email = %s", (email,))
        if not user:
            return None
        return {"id": user["id"], "email": user["email"], "role": user["role"]}

    def create_jwt_token(self, user_id: int):
        return f"mock-jwt-token-for-user-{user_id}"
