# Quick Start Guide

## First Time Setup

1. Install dependencies:
   ```bash
   npm install --legacy-peer-deps
   ```

2. Start the development server:
   ```bash
   npm start
   ```

3. Open your browser to `http://localhost:3000`

## Creating Your First Account

1. Click "Register" on the landing page
2. Enter your name, email, and password
3. Click "Create Account"
4. You'll be automatically logged in

## Creating Your First Household

1. After logging in, go to "Household" in the navigation
2. Click "Create Household"
3. Enter a name (e.g., "Smith Family Kitchen")
4. Other users can join by email (feature coming soon)

## Adding Your First Recipe

1. Click the "Add Recipe" button or navigate to Recipes → New
2. Fill in the recipe details:
   - Title
   - Description
   - Category
   - Prep/Cook time
   - Servings
   - Ingredients (one per line)
   - Instructions (step by step)
3. Click "Save Recipe"

## Planning Meals

1. Navigate to "Meal Planner"
2. Click on any day/meal slot
3. Select a recipe from your collection
4. The meal will be added to your calendar

## Creating Shopping Lists

1. Navigate to "Shopping"
2. Click "New List"
3. Either:
   - Add items manually
   - Or generate from recipes in your meal plan

## Tips

- Mark recipes as favorites by clicking the heart icon
- Share recipes with others using the share button
- Scale recipe servings up or down when viewing
- Use categories to organize your recipes
- The app works offline once loaded (PWA)

## Troubleshooting

### Blank screen after login
- Clear your browser cache and reload
- Check the browser console for errors

### Can't create recipes
- Make sure you've created a household first
- Check that you're logged in

### Images not uploading
- Storage bucket needs to be configured in Supabase
- Check file size (max 5MB recommended)

## Need Help?

Check the full README.md for more detailed information or report issues on GitHub.
