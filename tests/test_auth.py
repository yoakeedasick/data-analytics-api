"""
Unit tests for /auth/* endpoints.
"""

REGISTER_PAYLOAD = {
    "email": "test@example.com",
    "password": "Str0ngP@ssword!",
    "full_name": "Test User",
}


class TestRegister:
    def test_register_success(self, client):
        response = client.post("/auth/register", json=REGISTER_PAYLOAD)
        assert response.status_code == 201
        data = response.json()
        assert data["email"] == REGISTER_PAYLOAD["email"]
        assert "user_id" in data

    def test_register_duplicate_email(self, client):
        response = client.post("/auth/register", json=REGISTER_PAYLOAD)
        assert response.status_code == 409
        assert "already registered" in response.json()["detail"].lower()

    def test_register_invalid_email(self, client):
        response = client.post(
            "/auth/register", json={"email": "not-an-email", "password": "pass"})
        assert response.status_code == 422


class TestLogin:
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
        login_resp = client.post("/auth/login", json={
            "email": email,
            "password": "password123",
        })
        token = login_resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        resp = client.get("/auth/me", headers=headers)
        assert resp.status_code == 200
        assert resp.json()["email"] == email
