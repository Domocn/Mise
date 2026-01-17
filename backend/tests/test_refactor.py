import pytest
from unittest.mock import MagicMock, AsyncMock, patch
import sys
import os
from pathlib import Path

# Add backend to sys.path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

@pytest.fixture
def mock_db():
    with patch('backend.dependencies.client') as mock_client:
        mock_db = MagicMock()
        mock_client.__getitem__.return_value = mock_db
        # Mock collections
        mock_db.users = AsyncMock()
        mock_db.recipes = AsyncMock()
        mock_db.households = AsyncMock()
        yield mock_db

def test_imports():
    """Test that we can import the refactored modules"""
    try:
        from backend.server import app
        from backend.routers import auth, recipes
        from backend.config import settings
        from backend.models import UserCreate
    except ImportError as e:
        pytest.fail(f"Import failed: {e}")

def test_config_defaults():
    from backend.config import settings
    assert settings.db_name == "kitchenry"
    assert settings.jwt_algorithm == "HS256"

@pytest.mark.asyncio
async def test_lifespan():
    from backend.server import lifespan
    from fastapi import FastAPI

    app = FastAPI()

    # Mock db indices creation
    with patch('backend.server.db') as mock_db:
        mock_db.users.create_index = AsyncMock()
        mock_db.recipes.create_index = AsyncMock()

        async with lifespan(app):
            assert hasattr(app.state, 'http_client')
            assert mock_db.users.create_index.called

def test_router_prefixes():
    from backend.routers import auth, recipes, ai
    assert auth.router.prefix == "/auth"
    assert recipes.router.prefix == "/recipes"
    assert ai.router.prefix == "/ai"
