"""Tests for API endpoints — non-DB-dependent tests."""

import pytest


class TestHealth:
    async def test_health_returns_ok(self, client):
        resp = await client.get("/api/v1/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
        assert "version" in data


class TestTemplates:
    async def test_list_templates(self, client):
        resp = await client.get("/api/v1/templates")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) >= 5
        template_ids = {t["id"] for t in data}
        assert "ieee" in template_ids
        assert "harvard" in template_ids
        assert "apa" in template_ids

    async def test_template_fields(self, client):
        resp = await client.get("/api/v1/templates/ieee")
        assert resp.status_code == 200
        t = resp.json()
        assert t["name"] == "IEEE Conference"
        assert t["organization"] == "IEEE"
        assert t["format"] == "DOCX"
        assert "tags" in t

    async def test_template_not_found(self, client):
        resp = await client.get("/api/v1/templates/nonexistent")
        assert resp.status_code == 200
        assert resp.json() is None


class TestAuth:
    async def test_github_login_returns_url(self, client):
        """GitHub OAuth login endpoint returns an authorization URL."""
        resp = await client.get(
            "/api/v1/auth/github/login",
            params={"redirect_uri": "http://localhost:3000/callback"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "authorize_url" in data
        assert "github.com/login/oauth/authorize" in data["authorize_url"]

    async def test_github_login_missing_redirect_returns_422(self, client):
        """Missing required redirect_uri returns 422."""
        resp = await client.get("/api/v1/auth/github/login")
        assert resp.status_code == 422
