#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime, timedelta
import uuid

class KitchenryAPITester:
    def __init__(self, base_url="http://localhost:8001"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.household_id = None
        self.recipe_id = None
        self.meal_plan_id = None
        self.shopping_list_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=30)

            success = response.status_code == expected_status
            details = f"Status: {response.status_code}"
            
            if not success:
                try:
                    error_detail = response.json().get('detail', 'Unknown error')
                    details += f", Error: {error_detail}"
                except:
                    details += f", Response: {response.text[:100]}"
            
            self.log_test(name, success, details if not success else "")
            
            if success:
                try:
                    return response.json()
                except:
                    return {}
            return None

        except Exception as e:
            self.log_test(name, False, f"Exception: {str(e)}")
            return None

    def test_auth_flow(self):
        """Test authentication endpoints"""
        print("\n🔐 Testing Authentication...")
        
        # Generate unique test user
        timestamp = datetime.now().strftime('%H%M%S')
        test_email = f"test_{timestamp}@example.com"
        test_password = "TestPass123!"
        test_name = f"Test User {timestamp}"

        # Test registration
        register_data = {
            "email": test_email,
            "password": test_password,
            "name": test_name
        }
        
        result = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data=register_data
        )
        
        if result and 'token' in result:
            self.token = result['token']
            self.user_id = result['user']['id']
            
            # Test login
            login_data = {
                "email": test_email,
                "password": test_password
            }
            
            login_result = self.run_test(
                "User Login",
                "POST",
                "auth/login",
                200,
                data=login_data
            )
            
            if login_result and 'token' in login_result:
                self.token = login_result['token']
                
                # Test get current user
                self.run_test(
                    "Get Current User",
                    "GET",
                    "auth/me",
                    200
                )
            
            return True
        return False

    def test_household_flow(self):
        """Test household management"""
        print("\n🏠 Testing Household Management...")
        
        # Create household
        household_data = {"name": f"Test Household {datetime.now().strftime('%H%M%S')}"}
        
        result = self.run_test(
            "Create Household",
            "POST",
            "households",
            200,
            data=household_data
        )
        
        if result and 'id' in result:
            self.household_id = result['id']
            
            # Get my household
            self.run_test(
                "Get My Household",
                "GET",
                "households/me",
                200
            )
            
            # Get household members
            self.run_test(
                "Get Household Members",
                "GET",
                "households/members",
                200
            )
            
            return True
        return False

    def test_recipe_flow(self):
        """Test recipe CRUD operations"""
        print("\n🍳 Testing Recipe Management...")
        
        # Create recipe
        recipe_data = {
            "title": f"Test Recipe {datetime.now().strftime('%H%M%S')}",
            "description": "A delicious test recipe",
            "ingredients": [
                {"name": "Test Ingredient 1", "amount": "2", "unit": "cups"},
                {"name": "Test Ingredient 2", "amount": "1", "unit": "tbsp"}
            ],
            "instructions": [
                "Step 1: Prepare ingredients",
                "Step 2: Mix everything together",
                "Step 3: Cook and enjoy"
            ],
            "prep_time": 15,
            "cook_time": 30,
            "servings": 4,
            "category": "Dinner",
            "tags": ["test", "easy"]
        }
        
        result = self.run_test(
            "Create Recipe",
            "POST",
            "recipes",
            200,
            data=recipe_data
        )
        
        if result and 'id' in result:
            self.recipe_id = result['id']
            
            # Get all recipes
            self.run_test(
                "Get All Recipes",
                "GET",
                "recipes",
                200
            )
            
            # Get specific recipe
            self.run_test(
                "Get Recipe by ID",
                "GET",
                f"recipes/{self.recipe_id}",
                200
            )
            
            # Update recipe
            updated_recipe = recipe_data.copy()
            updated_recipe['title'] = f"Updated {recipe_data['title']}"
            
            self.run_test(
                "Update Recipe",
                "PUT",
                f"recipes/{self.recipe_id}",
                200,
                data=updated_recipe
            )
            
            return True
        return False

    def test_meal_plan_flow(self):
        """Test meal planning"""
        print("\n📅 Testing Meal Planning...")
        
        if not self.recipe_id:
            print("⚠️  Skipping meal plan tests - no recipe available")
            return False
        
        # Create meal plan
        meal_plan_data = {
            "date": (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d'),
            "meal_type": "Dinner",
            "recipe_id": self.recipe_id,
            "notes": "Test meal plan"
        }
        
        result = self.run_test(
            "Create Meal Plan",
            "POST",
            "meal-plans",
            200,
            data=meal_plan_data
        )
        
        if result and 'id' in result:
            self.meal_plan_id = result['id']
            
            # Get meal plans
            self.run_test(
                "Get Meal Plans",
                "GET",
                "meal-plans",
                200
            )
            
            return True
        return False

    def test_shopping_list_flow(self):
        """Test shopping list management"""
        print("\n🛒 Testing Shopping Lists...")
        
        # Create shopping list
        shopping_list_data = {
            "name": f"Test Shopping List {datetime.now().strftime('%H%M%S')}",
            "items": [
                {"name": "Test Item 1", "amount": "2", "unit": "lbs", "checked": False},
                {"name": "Test Item 2", "amount": "1", "unit": "bottle", "checked": False}
            ]
        }
        
        result = self.run_test(
            "Create Shopping List",
            "POST",
            "shopping-lists",
            200,
            data=shopping_list_data
        )
        
        if result and 'id' in result:
            self.shopping_list_id = result['id']
            
            # Get all shopping lists
            self.run_test(
                "Get All Shopping Lists",
                "GET",
                "shopping-lists",
                200
            )
            
            # Get specific shopping list
            self.run_test(
                "Get Shopping List by ID",
                "GET",
                f"shopping-lists/{self.shopping_list_id}",
                200
            )
            
            # Update shopping list
            updated_list = shopping_list_data.copy()
            updated_list['items'][0]['checked'] = True
            
            self.run_test(
                "Update Shopping List",
                "PUT",
                f"shopping-lists/{self.shopping_list_id}",
                200,
                data=updated_list
            )
            
            return True
        return False

    def test_ai_features(self):
        """Test AI-powered features"""
        print("\n🤖 Testing AI Features...")
        
        # Test fridge search
        fridge_data = {
            "ingredients": ["chicken", "rice", "onion"],
            "search_online": True
        }
        
        self.run_test(
            "AI Fridge Search",
            "POST",
            "ai/fridge-search",
            200,
            data=fridge_data
        )
        
        # Test recipe import from URL (might fail due to URL access)
        import_data = {
            "url": "https://www.allrecipes.com/recipe/213742/cheesy-chicken-broccoli-casserole/"
        }
        
        # This might fail due to network restrictions, so we'll be lenient
        result = self.run_test(
            "AI Recipe Import from URL",
            "POST",
            "ai/import-url",
            200,
            data=import_data
        )

    def test_categories(self):
        """Test categories endpoint"""
        print("\n📂 Testing Categories...")
        
        self.run_test(
            "Get Categories",
            "GET",
            "categories",
            200
        )

    def test_cleanup(self):
        """Clean up test data"""
        print("\n🧹 Cleaning up test data...")
        
        # Delete meal plan
        if self.meal_plan_id:
            self.run_test(
                "Delete Meal Plan",
                "DELETE",
                f"meal-plans/{self.meal_plan_id}",
                200
            )
        
        # Delete shopping list
        if self.shopping_list_id:
            self.run_test(
                "Delete Shopping List",
                "DELETE",
                f"shopping-lists/{self.shopping_list_id}",
                200
            )
        
        # Delete recipe
        if self.recipe_id:
            self.run_test(
                "Delete Recipe",
                "DELETE",
                f"recipes/{self.recipe_id}",
                200
            )

    def run_all_tests(self):
        """Run comprehensive test suite"""
        print("🚀 Starting Kitchenry API Test Suite")
        print(f"Testing against: {self.base_url}")
        print("=" * 50)
        
        # Run test flows
        auth_success = self.test_auth_flow()
        
        if auth_success:
            self.test_household_flow()
            self.test_recipe_flow()
            self.test_meal_plan_flow()
            self.test_shopping_list_flow()
            self.test_ai_features()
            self.test_categories()
            self.test_cleanup()
        else:
            print("❌ Authentication failed - skipping other tests")
        
        # Print summary
        print("\n" + "=" * 50)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print(f"📈 Success Rate: {success_rate:.1f}%")
        
        # Print failed tests
        failed_tests = [t for t in self.test_results if not t['success']]
        if failed_tests:
            print(f"\n❌ Failed Tests ({len(failed_tests)}):")
            for test in failed_tests:
                print(f"  • {test['test']}: {test['details']}")
        
        return self.tests_passed == self.tests_run

def main():
    tester = KitchenryAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())