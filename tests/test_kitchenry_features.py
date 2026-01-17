"""
Kitchenry Backend API Tests - Iteration 2
Tests for new features: Platform Import, Push Notifications, LLM Settings
"""
import pytest
import requests
import os
import json

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8001').rstrip('/')

# Test credentials
TEST_USER_EMAIL = "test@test.com"
TEST_USER_PASSWORD = "password"
ALT_USER_EMAIL = "import@test.com"
ALT_USER_PASSWORD = "password123"


class TestHealthAndBranding:
    """Test health endpoint and Kitchenry branding"""
    
    def test_health_endpoint(self):
        """Test health endpoint returns Kitchenry branding"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["app"] == "Kitchenry", f"Expected 'Kitchenry', got {data.get('app')}"
        assert data["status"] == "healthy"
        print(f"✓ Health check passed - App: {data['app']}")
    
    def test_config_endpoint(self):
        """Test config endpoint"""
        response = requests.get(f"{BASE_URL}/api/config")
        assert response.status_code == 200
        data = response.json()
        assert "llm_provider" in data
        assert "features" in data
        print(f"✓ Config endpoint working - LLM Provider: {data['llm_provider']}")


class TestAuthentication:
    """Test authentication flows"""
    
    def test_login_existing_user(self):
        """Test login with existing test user"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        print(f"✓ Login successful for {TEST_USER_EMAIL}")
        return data["token"]
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "invalid@test.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("✓ Invalid credentials correctly rejected")
    
    def test_register_new_user(self):
        """Test user registration"""
        import uuid
        unique_email = f"test_{uuid.uuid4().hex[:8]}@test.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "testpass123",
            "name": "Test User"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        print(f"✓ Registration successful for {unique_email}")


class TestPlatformImport:
    """Test /api/import/platform endpoint for recipe imports"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for tests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Authentication failed")
    
    def test_import_json_format(self, auth_token):
        """Test importing recipes in generic JSON format"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        json_data = json.dumps([{
            "title": "TEST_Imported Pasta",
            "description": "Test imported recipe",
            "ingredients": [
                {"name": "pasta", "amount": "400", "unit": "g"},
                {"name": "tomato sauce", "amount": "200", "unit": "ml"}
            ],
            "instructions": ["Boil pasta", "Add sauce", "Serve"],
            "prep_time": 10,
            "cook_time": 20,
            "servings": 4,
            "category": "Dinner",
            "tags": ["italian", "quick"]
        }])
        
        response = requests.post(
            f"{BASE_URL}/api/import/platform",
            headers=headers,
            json={"platform": "json", "data": json_data}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["imported"] >= 1
        print(f"✓ JSON import successful - Imported {data['imported']} recipe(s)")
    
    def test_import_paprika_format(self, auth_token):
        """Test importing recipes in Paprika format"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        paprika_data = json.dumps([{
            "name": "TEST_Paprika Carbonara",
            "description": "Classic Italian pasta from Paprika",
            "ingredients": "400g spaghetti\n200g guanciale\n4 egg yolks\n100g pecorino",
            "directions": "Cook pasta.\nFry guanciale.\nMix eggs with cheese.\nCombine all.",
            "prep_time": "10 minutes",
            "cook_time": "20 minutes",
            "servings": "4",
            "categories": ["Italian", "Pasta"]
        }])
        
        response = requests.post(
            f"{BASE_URL}/api/import/platform",
            headers=headers,
            json={"platform": "paprika", "data": paprika_data}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["imported"] >= 1
        print(f"✓ Paprika import successful - Imported {data['imported']} recipe(s)")
    
    def test_import_cookmate_format(self, auth_token):
        """Test importing recipes in Cookmate format"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        cookmate_data = json.dumps([{
            "title": "TEST_Cookmate Salad",
            "description": "Fresh garden salad",
            "ingredients": [
                {"name": "lettuce", "amount": "1", "unit": "head"},
                {"name": "tomatoes", "amount": "2", "unit": ""}
            ],
            "instructions": ["Wash vegetables", "Chop", "Mix together"],
            "prep_time": 15,
            "cook_time": 0,
            "servings": 2,
            "category": "Lunch",
            "tags": ["healthy", "quick"]
        }])
        
        response = requests.post(
            f"{BASE_URL}/api/import/platform",
            headers=headers,
            json={"platform": "cookmate", "data": cookmate_data}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["imported"] >= 1
        print(f"✓ Cookmate import successful - Imported {data['imported']} recipe(s)")
    
    def test_import_invalid_json(self, auth_token):
        """Test importing with invalid JSON data"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = requests.post(
            f"{BASE_URL}/api/import/platform",
            headers=headers,
            json={"platform": "json", "data": "not valid json"}
        )
        
        assert response.status_code == 400
        print("✓ Invalid JSON correctly rejected")
    
    def test_import_without_auth(self):
        """Test import endpoint requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/import/platform",
            json={"platform": "json", "data": "[]"}
        )
        assert response.status_code in [401, 403]
        print("✓ Import endpoint correctly requires authentication")


class TestLLMSettings:
    """Test LLM settings endpoints"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for tests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Authentication failed")
    
    def test_get_llm_settings(self, auth_token):
        """Test getting LLM settings"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/settings/llm", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "provider" in data
        print(f"✓ LLM settings retrieved - Provider: {data['provider']}")
    
    def test_update_llm_settings(self, auth_token):
        """Test updating LLM settings"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = requests.put(
            f"{BASE_URL}/api/settings/llm",
            headers=headers,
            json={
                "provider": "openai",
                "ollama_url": "http://localhost:11434",
                "ollama_model": "llama3"
            }
        )
        
        assert response.status_code == 200
        print("✓ LLM settings updated successfully")
    
    def test_test_llm_connection_openai(self, auth_token):
        """Test LLM connection test for OpenAI"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = requests.post(
            f"{BASE_URL}/api/settings/llm/test",
            headers=headers,
            json={
                "provider": "openai",
                "ollama_url": "http://localhost:11434",
                "ollama_model": "llama3"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "success" in data
        print(f"✓ OpenAI connection test - Success: {data['success']}")


class TestNotificationSettings:
    """Test push notification settings endpoints"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for tests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Authentication failed")
    
    def test_get_notification_settings(self, auth_token):
        """Test getting notification settings"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/notifications/settings", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "meal_reminders" in data
        print(f"✓ Notification settings retrieved - Meal reminders: {data['meal_reminders']}")
    
    def test_update_notification_settings(self, auth_token):
        """Test updating notification settings"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = requests.put(
            f"{BASE_URL}/api/notifications/settings",
            headers=headers,
            json={
                "meal_reminders": True,
                "reminder_time": 30,
                "shopping_reminders": True,
                "weekly_plan_reminder": False
            }
        )
        
        assert response.status_code == 200
        print("✓ Notification settings updated successfully")
    
    def test_subscribe_push_notifications(self, auth_token):
        """Test subscribing to push notifications"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Mock push subscription object
        subscription = {
            "endpoint": "https://fcm.googleapis.com/fcm/send/test-endpoint",
            "keys": {
                "p256dh": "test-p256dh-key",
                "auth": "test-auth-key"
            }
        }
        
        response = requests.post(
            f"{BASE_URL}/api/notifications/subscribe",
            headers=headers,
            json=subscription
        )
        
        assert response.status_code == 200
        print("✓ Push notification subscription successful")


class TestRecipeCRUD:
    """Test recipe CRUD operations"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for tests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Authentication failed")
    
    def test_get_recipes(self, auth_token):
        """Test getting recipes list"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/recipes", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Retrieved {len(data)} recipes")
    
    def test_create_recipe(self, auth_token):
        """Test creating a new recipe"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        recipe_data = {
            "title": "TEST_New Recipe",
            "description": "Test recipe description",
            "ingredients": [
                {"name": "ingredient1", "amount": "1", "unit": "cup"}
            ],
            "instructions": ["Step 1", "Step 2"],
            "prep_time": 10,
            "cook_time": 20,
            "servings": 4,
            "category": "Dinner",
            "tags": ["test"]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/recipes",
            headers=headers,
            json=recipe_data
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "TEST_New Recipe"
        print(f"✓ Recipe created with ID: {data['id']}")
        return data["id"]
    
    def test_get_categories(self, auth_token):
        """Test getting categories"""
        response = requests.get(f"{BASE_URL}/api/categories")
        
        assert response.status_code == 200
        data = response.json()
        assert "categories" in data
        print(f"✓ Retrieved {len(data['categories'])} categories")


class TestCalendarExport:
    """Test calendar export functionality"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for tests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Authentication failed")
    
    def test_ical_export(self, auth_token):
        """Test iCal export endpoint"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/calendar/ical",
            headers=headers,
            params={"start_date": "2025-01-01", "end_date": "2025-01-31"}
        )
        
        assert response.status_code == 200
        assert "text/calendar" in response.headers.get("content-type", "")
        assert "VCALENDAR" in response.text
        assert "Kitchenry" in response.text  # Check branding in iCal
        print("✓ iCal export working with Kitchenry branding")


class TestHomeAssistant:
    """Test Home Assistant integration endpoints"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for tests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Authentication failed")
    
    def test_homeassistant_config(self):
        """Test Home Assistant config endpoint"""
        response = requests.get(f"{BASE_URL}/api/homeassistant/config")
        
        assert response.status_code == 200
        data = response.json()
        assert "sensors" in data
        assert "Kitchenry" in str(data)  # Check branding
        print("✓ Home Assistant config endpoint working")
    
    def test_homeassistant_today(self, auth_token):
        """Test Home Assistant today's meals endpoint"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/homeassistant/today", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "meals" in data
        assert "summary" in data
        print(f"✓ Today's meals: {data['summary']}")
    
    def test_homeassistant_shopping(self, auth_token):
        """Test Home Assistant shopping list endpoint"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/homeassistant/shopping", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "unchecked" in data
        print(f"✓ Shopping list: {data.get('summary', 'No items')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
