from tests.conftest import TestingSessionLocal
from app.models.user import User

REGISTER_PAYLOAD = {
    "email": "test@example.com",
    "password": "Str0ngP@ssword!",
    "full_name": "Test User",
}


def verify_user_in_db(email: str):
    db = TestingSessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if user:
            user.is_verified = True
            user.otp_code = None
            user.otp_expires_at = None
            db.commit()
    finally:
        db.close()


class TestRegister:
    def test_register_success(self, client):
        response = client.post("/auth/register", json=REGISTER_PAYLOAD)
        assert response.status_code == 201
        data = response.json()
        assert data["email"] == REGISTER_PAYLOAD["email"]
        assert "message" in data
        assert "verification" in data["message"].lower()

    def test_verify_otp_success(self, client):
        # Fetch OTP code from DB
        db = TestingSessionLocal()
        try:
            user = db.query(User).filter(User.email == REGISTER_PAYLOAD["email"]).first()
            otp = user.otp_code
        finally:
            db.close()

        resp = client.post("/auth/verify-otp", json={
            "email": REGISTER_PAYLOAD["email"],
            "otp_code": otp
        })
        assert resp.status_code == 200
        assert "verified" in resp.json()["message"].lower()

    def test_verify_otp_wrong_code(self, client):
        db = TestingSessionLocal()
        try:
            user = db.query(User).filter(User.email == REGISTER_PAYLOAD["email"]).first()
            if user:
                user.is_verified = False
                user.otp_code = "123456"
                db.commit()
        finally:
            db.close()

        resp = client.post("/auth/verify-otp", json={
            "email": REGISTER_PAYLOAD["email"],
            "otp_code": "000000"
        })
        assert resp.status_code == 400
        assert "invalid" in resp.json()["detail"].lower()

        # Restore verification state so other tests proceed
        verify_user_in_db(REGISTER_PAYLOAD["email"])

    def test_register_duplicate_email(self, client):
        response = client.post("/auth/register", json=REGISTER_PAYLOAD)
        assert response.status_code == 409
        assert "already registered" in response.json()["detail"].lower()

    def test_register_invalid_email(self, client):
        response = client.post(
            "/auth/register", json={"email": "not-an-email", "password": "pass"})
        assert response.status_code == 422


class TestLogin:
    def test_login_unverified_user(self, client):
        email = "unverified@example.com"
        client.post("/auth/register", json={
            "email": email,
            "password": "password123",
            "full_name": "Unverified User"
        })
        resp = client.post("/auth/login", json={
            "email": email,
            "password": "password123"
        })
        assert resp.status_code == 403
        assert "not verified" in resp.json()["detail"].lower()

    def test_login_success(self, client):
        response = client.post("/auth/login", json={
            "email": REGISTER_PAYLOAD["email"],
            "password": REGISTER_PAYLOAD["password"],
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"

    def test_login_wrong_password(self, client):
        response = client.post("/auth/login", json={
            "email": REGISTER_PAYLOAD["email"],
            "password": "wrongpassword",
        })
        assert response.status_code == 401

    def test_login_nonexistent_user(self, client):
        response = client.post("/auth/login", json={
            "email": "nobody@example.com",
            "password": "anything",
        })
        assert response.status_code == 401


class TestRefresh:
    def test_refresh_success(self, client):
        # Login first to get tokens
        login_resp = client.post("/auth/login", json={
            "email": REGISTER_PAYLOAD["email"],
            "password": REGISTER_PAYLOAD["password"],
        })
        refresh_token = login_resp.json()["refresh_token"]

        response = client.post(
            "/auth/refresh", json={"refresh_token": refresh_token})
        assert response.status_code == 200
        assert "access_token" in response.json()

    def test_refresh_invalid_token(self, client):
        response = client.post(
            "/auth/refresh", json={"refresh_token": "invalid.token.here"})
        assert response.status_code == 401


class TestUpdateSettings:
    def test_update_profile_success(self, client):
        login_resp = client.post("/auth/login", json={
            "email": REGISTER_PAYLOAD["email"],
            "password": REGISTER_PAYLOAD["password"],
        })
        token = login_resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        resp = client.put(
            "/auth/profile", json={"full_name": "Updated Name"}, headers=headers)
        assert resp.status_code == 200
        assert resp.json()["full_name"] == "Updated Name"

    def test_update_password_success(self, client):
        login_resp = client.post("/auth/login", json={
            "email": REGISTER_PAYLOAD["email"],
            "password": REGISTER_PAYLOAD["password"],
        })
        token = login_resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        resp = client.put("/auth/password", json={
            "current_password": REGISTER_PAYLOAD["password"],
            "new_password": "brandnewpassword"
        }, headers=headers)
        assert resp.status_code == 200
        assert resp.json()["detail"] == "Password updated successfully"

        login_resp = client.post("/auth/login", json={
            "email": REGISTER_PAYLOAD["email"],
            "password": "brandnewpassword",
        })
        assert login_resp.status_code == 200

    def test_get_me_success(self, client):
        email = "testme@example.com"
        client.post("/auth/register", json={
            "email": email,
            "password": "password123",
            "fullName": "Me User"
        })
        verify_user_in_db(email)
        login_resp = client.post("/auth/login", json={
            "email": email,
            "password": "password123",
        })
        token = login_resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        resp = client.get("/auth/me", headers=headers)
        assert resp.status_code == 200
        assert resp.json()["email"] == email


class TestForgotPassword:
    def test_forgot_password_success(self, client):
        email = "forgot@example.com"
        client.post("/auth/register", json={
            "email": email,
            "password": "oldpassword",
            "full_name": "Forgot User"
        })
        verify_user_in_db(email)

        # Trigger forgot password
        resp = client.post("/auth/forgot-password", json={"email": email})
        assert resp.status_code == 200
        assert "verification" in resp.json()["message"].lower()

        # Fetch OTP code from DB
        db = TestingSessionLocal()
        try:
            user = db.query(User).filter(User.email == email).first()
            otp = user.otp_code
        finally:
            db.close()

        # Reset password with correct OTP code
        resp = client.post("/auth/reset-password", json={
            "email": email,
            "otp_code": otp,
            "new_password": "newsuperpassword"
        })
        assert resp.status_code == 200
        assert "success" in resp.json()["message"].lower()

        # Login with new password
        login_resp = client.post("/auth/login", json={
            "email": email,
            "password": "newsuperpassword"
        })
        assert login_resp.status_code == 200

    def test_forgot_password_nonexistent_email(self, client):
        resp = client.post("/auth/forgot-password", json={"email": "nobody_exists@example.com"})
        assert resp.status_code == 404

    def test_reset_password_invalid_otp(self, client):
        email = "forgot@example.com"
        resp = client.post("/auth/reset-password", json={
            "email": email,
            "otp_code": "000000",
            "new_password": "somepassword"
        })
        assert resp.status_code == 400
        assert "invalid" in resp.json()["detail"].lower()
