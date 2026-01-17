"""
Kitchenry Backend API Tests - Iteration 3
Tests for new features: Recipe Favorites, Recipe Scaling, Recipe Print
"""
import pytest
import requests
import os
import json

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8001').rstrip('/')

# Test credentials
TEST_USER_EMAIL = "test@test.com"
TEST_USER_PASSWORD = "password"


@pytest.fixture(scope="module")
def auth_token():
    """Get auth token for tests"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_USER_EMAIL,
        "password": TEST_USER_PASSWORD
    })
    if response.status_code == 200:
        return response.json()["token"]
    pytest.skip("Authentication failed")


@pytest.fixture(scope="module")
def test_recipe_id(auth_token):
    """Create a test recipe and return its ID"""
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    recipe_data = {
        "title": "TEST_Scaling Recipe",
        "description": "Recipe for testing scaling feature",
        "ingredients": [
            {"name": "flour", "amount": "2", "unit": "cups"},
            {"name": "sugar", "amount": "1", "unit": "cup"},
            {"name": "eggs", "amount": "3", "unit": ""},
            {"name": "milk", "amount": "1/2", "unit": "cup"},
            {"name": "butter", "amount": "0.5", "unit": "cup"}
        ],
        "instructions": ["Mix dry ingredients", "Add wet ingredients", "Bake at 350F"],
        "prep_time": 15,
        "cook_time": 30,
        "servings": 4,
        "category": "Dessert",
        "tags": ["baking", "test"]
    }
    
    response = requests.post(
        f"{BASE_URL}/api/recipes",
        headers=headers,
        json=recipe_data
    )
    
    if response.status_code == 200:
        return response.json()["id"]
    pytest.skip("Failed to create test recipe")


class TestRecipeFavorites:
    """Test recipe favorites functionality"""
    
    def test_toggle_favorite_add(self, auth_token, test_recipe_id):
        """Test adding a recipe to favorites"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # First ensure it's not a favorite
        response = requests.get(
            f"{BASE_URL}/api/recipes/{test_recipe_id}",
            headers=headers
        )
        assert response.status_code == 200
        
        # Toggle favorite (add)
        response = requests.post(
            f"{BASE_URL}/api/recipes/{test_recipe_id}/favorite",
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "is_favorite" in data
        assert "message" in data
        print(f"✓ Toggle favorite: {data['message']}")
    
    def test_get_favorites_endpoint(self, auth_token):
        """Test GET /api/favorites endpoint"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/favorites",
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "recipes" in data
        assert "count" in data
        assert isinstance(data["recipes"], list)
        print(f"✓ Get favorites: {data['count']} favorite(s)")
    
    def test_favorites_only_filter(self, auth_token, test_recipe_id):
        """Test GET /api/recipes with favorites_only=true filter"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Ensure recipe is favorited
        requests.post(
            f"{BASE_URL}/api/recipes/{test_recipe_id}/favorite",
            headers=headers
        )
        
        # Get favorites only
        response = requests.get(
            f"{BASE_URL}/api/recipes",
            headers=headers,
            params={"favorites_only": "true"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # All returned recipes should be favorites
        for recipe in data:
            assert recipe.get("is_favorite") == True
        print(f"✓ Favorites filter: {len(data)} favorite recipe(s)")
    
    def test_recipe_has_is_favorite_field(self, auth_token, test_recipe_id):
        """Test that recipe response includes is_favorite field"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/recipes/{test_recipe_id}",
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "is_favorite" in data
        assert isinstance(data["is_favorite"], bool)
        print(f"✓ Recipe has is_favorite field: {data['is_favorite']}")
    
    def test_toggle_favorite_remove(self, auth_token, test_recipe_id):
        """Test removing a recipe from favorites"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # First add to favorites
        requests.post(
            f"{BASE_URL}/api/recipes/{test_recipe_id}/favorite",
            headers=headers
        )
        
        # Toggle again to remove
        response = requests.post(
            f"{BASE_URL}/api/recipes/{test_recipe_id}/favorite",
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        # Should toggle the state
        print(f"✓ Toggle favorite again: {data['message']}")
    
    def test_favorite_nonexistent_recipe(self, auth_token):
        """Test favoriting a non-existent recipe returns 404"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = requests.post(
            f"{BASE_URL}/api/recipes/nonexistent-id-12345/favorite",
            headers=headers
        )
        
        assert response.status_code == 404
        print("✓ Favoriting non-existent recipe returns 404")


class TestRecipeScaling:
    """Test recipe scaling functionality"""
    
    def test_scale_recipe_double(self, auth_token, test_recipe_id):
        """Test scaling recipe to double servings"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/recipes/{test_recipe_id}/scaled",
            headers=headers,
            params={"servings": 8}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["original_servings"] == 4
        assert data["scaled_servings"] == 8
        assert data["scale_factor"] == 2.0
        assert "ingredients" in data
        
        # Check that amounts are doubled
        for ing in data["ingredients"]:
            if ing["name"] == "flour":
                assert ing["amount"] == "4"  # 2 * 2 = 4
            elif ing["name"] == "sugar":
                assert ing["amount"] == "2"  # 1 * 2 = 2
            elif ing["name"] == "eggs":
                assert ing["amount"] == "6"  # 3 * 2 = 6
        
        print(f"✓ Scale to 8 servings: factor={data['scale_factor']}")
    
    def test_scale_recipe_half(self, auth_token, test_recipe_id):
        """Test scaling recipe to half servings"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/recipes/{test_recipe_id}/scaled",
            headers=headers,
            params={"servings": 2}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["original_servings"] == 4
        assert data["scaled_servings"] == 2
        assert data["scale_factor"] == 0.5
        
        # Check that amounts are halved
        for ing in data["ingredients"]:
            if ing["name"] == "flour":
                assert ing["amount"] == "1"  # 2 * 0.5 = 1
            elif ing["name"] == "sugar":
                assert ing["amount"] == "0.5"  # 1 * 0.5 = 0.5
        
        print(f"✓ Scale to 2 servings: factor={data['scale_factor']}")
    
    def test_scale_recipe_fraction_handling(self, auth_token, test_recipe_id):
        """Test scaling handles fractions correctly"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/recipes/{test_recipe_id}/scaled",
            headers=headers,
            params={"servings": 8}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Check fraction handling (1/2 cup milk * 2 = 1 cup)
        for ing in data["ingredients"]:
            if ing["name"] == "milk":
                assert ing["amount"] == "1"  # 0.5 * 2 = 1
        
        print("✓ Fraction handling works correctly")
    
    def test_scale_recipe_minimum_servings(self, auth_token, test_recipe_id):
        """Test scaling with minimum servings (1)"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/recipes/{test_recipe_id}/scaled",
            headers=headers,
            params={"servings": 1}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["scaled_servings"] == 1
        print(f"✓ Scale to 1 serving: factor={data['scale_factor']}")
    
    def test_scale_recipe_invalid_servings(self, auth_token, test_recipe_id):
        """Test scaling with invalid servings (0 or negative)"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Test with 0
        response = requests.get(
            f"{BASE_URL}/api/recipes/{test_recipe_id}/scaled",
            headers=headers,
            params={"servings": 0}
        )
        assert response.status_code == 422  # Validation error
        
        # Test with negative
        response = requests.get(
            f"{BASE_URL}/api/recipes/{test_recipe_id}/scaled",
            headers=headers,
            params={"servings": -1}
        )
        assert response.status_code == 422
        
        print("✓ Invalid servings correctly rejected")
    
    def test_scale_nonexistent_recipe(self, auth_token):
        """Test scaling a non-existent recipe returns 404"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/recipes/nonexistent-id-12345/scaled",
            headers=headers,
            params={"servings": 4}
        )
        
        assert response.status_code == 404
        print("✓ Scaling non-existent recipe returns 404")


class TestRecipePrint:
    """Test recipe print functionality"""
    
    def test_get_print_recipe(self, auth_token, test_recipe_id):
        """Test GET /api/recipes/{id}/print endpoint"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/recipes/{test_recipe_id}/print",
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Check required fields
        assert "title" in data
        assert "description" in data
        assert "servings" in data
        assert "prep_time" in data
        assert "cook_time" in data
        assert "total_time" in data
        assert "ingredients" in data
        assert "instructions" in data
        assert "printed_at" in data
        
        # Check total_time calculation
        assert data["total_time"] == data["prep_time"] + data["cook_time"]
        
        print(f"✓ Print recipe: {data['title']} (total time: {data['total_time']} min)")
    
    def test_print_recipe_has_all_fields(self, auth_token, test_recipe_id):
        """Test print response includes all necessary fields for printing"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/recipes/{test_recipe_id}/print",
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify ingredients structure
        assert isinstance(data["ingredients"], list)
        if data["ingredients"]:
            ing = data["ingredients"][0]
            assert "name" in ing
            assert "amount" in ing
        
        # Verify instructions structure
        assert isinstance(data["instructions"], list)
        
        # Verify optional fields
        assert "category" in data
        assert "tags" in data
        
        print("✓ Print response has all required fields")
    
    def test_print_nonexistent_recipe(self, auth_token):
        """Test printing a non-existent recipe returns 404"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/recipes/nonexistent-id-12345/print",
            headers=headers
        )
        
        assert response.status_code == 404
        print("✓ Printing non-existent recipe returns 404")


class TestRecipeListWithFavorites:
    """Test recipe list includes favorite status"""
    
    def test_recipes_list_has_is_favorite(self, auth_token):
        """Test that recipe list includes is_favorite field"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/recipes",
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        if data:
            # Check first recipe has is_favorite field
            assert "is_favorite" in data[0]
            print(f"✓ Recipe list includes is_favorite field")
        else:
            print("✓ No recipes to check (empty list)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
