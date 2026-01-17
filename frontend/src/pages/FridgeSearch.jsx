import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Layout } from '../components/Layout';
import { RecipeCard } from '../components/RecipeCard';
import { aiApi } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Checkbox } from '../components/ui/checkbox';
import { 
  Refrigerator, 
  Search, 
  Loader2, 
  Sparkles,
  Plus,
  X,
  ChefHat
} from 'lucide-react';
import { toast } from 'sonner';

const commonIngredients = [
  'Chicken', 'Beef', 'Pork', 'Fish', 'Eggs', 'Tofu',
  'Rice', 'Pasta', 'Bread', 'Potatoes',
  'Tomatoes', 'Onions', 'Garlic', 'Carrots', 'Broccoli',
  'Cheese', 'Milk', 'Butter', 'Cream',
  'Olive Oil', 'Soy Sauce', 'Lemon'
];

export const FridgeSearch = () => {
  const [ingredients, setIngredients] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchOnline, setSearchOnline] = useState(false);
  const [results, setResults] = useState(null);

  const addIngredient = (ingredient) => {
    const trimmed = ingredient.trim();
    if (trimmed && !ingredients.includes(trimmed)) {
      setIngredients([...ingredients, trimmed]);
    }
    setInputValue('');
  };

  const removeIngredient = (ingredient) => {
    setIngredients(ingredients.filter(i => i !== ingredient));
  };

  const handleSearch = async () => {
    if (ingredients.length === 0) {
      toast.error('Please add at least one ingredient');
      return;
    }

    setLoading(true);
    setResults(null);
    
    try {
      const res = await aiApi.fridgeSearch(ingredients, searchOnline);
      setResults(res.data);
      
      if (res.data.matching_recipes.length === 0 && !res.data.ai_recipe_suggestion) {
        toast.info('No exact matches found. Try adding more ingredients or enable online search.');
      }
    } catch (error) {
      toast.error('Failed to search recipes');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      addIngredient(inputValue);
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-8" data-testid="fridge-search">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-sage-light mx-auto mb-4 flex items-center justify-center">
            <Refrigerator className="w-8 h-8 text-sage" />
          </div>
          <h1 className="font-heading text-3xl font-bold">What's in My Fridge?</h1>
          <p className="text-muted-foreground mt-2">
            Enter your available ingredients and find matching recipes
          </p>
        </motion.div>

        {/* Ingredient Input */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl border border-border/60 p-6 shadow-card"
        >
          <div className="flex gap-3 mb-4">
            <Input
              placeholder="Type an ingredient and press Enter..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              className="rounded-xl"
              data-testid="ingredient-input"
            />
            <Button 
              onClick={() => inputValue.trim() && addIngredient(inputValue)}
              className="rounded-xl bg-sage hover:bg-sage-dark"
              disabled={!inputValue.trim()}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {/* Selected Ingredients */}
          {ingredients.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4" data-testid="selected-ingredients">
              {ingredients.map((ing) => (
                <Badge 
                  key={ing} 
                  variant="secondary"
                  className="bg-sage-light text-sage px-3 py-1.5 text-sm"
                >
                  {ing}
                  <button 
                    onClick={() => removeIngredient(ing)}
                    className="ml-2 hover:text-sage-dark"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          {/* Quick Add */}
          <div className="border-t border-border/60 pt-4 mt-4">
            <p className="text-sm text-muted-foreground mb-3">Quick add:</p>
            <div className="flex flex-wrap gap-2">
              {commonIngredients.filter(i => !ingredients.includes(i)).slice(0, 12).map((ing) => (
                <button
                  key={ing}
                  onClick={() => addIngredient(ing)}
                  className="px-3 py-1.5 rounded-full text-sm bg-cream-subtle hover:bg-sage-light text-foreground transition-colors"
                >
                  + {ing}
                </button>
              ))}
            </div>
          </div>

          {/* Options */}
          <div className="flex items-center gap-6 mt-6 pt-4 border-t border-border/60">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox 
                checked={searchOnline}
                onCheckedChange={(checked) => setSearchOnline(checked)}
              />
              <span className="text-sm">
                <Sparkles className="w-4 h-4 inline mr-1 text-terracotta" />
                Suggest new recipes with AI
              </span>
            </label>
          </div>

          {/* Search Button */}
          <Button 
            onClick={handleSearch}
            className="w-full mt-6 rounded-full bg-sage hover:bg-sage-dark h-12"
            disabled={loading || ingredients.length === 0}
            data-testid="search-recipes-btn"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Search className="w-5 h-5 mr-2" />
                Find Recipes
              </>
            )}
          </Button>
        </motion.div>

        {/* Results */}
        {results && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {/* Matching Recipes */}
            {results.matching_recipes.length > 0 && (
              <div>
                <h2 className="font-heading text-xl font-semibold mb-4">
                  Matching Recipes ({results.matching_recipes.length})
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {results.matching_recipes.map((recipe) => (
                    <RecipeCard key={recipe.id} recipe={recipe} />
                  ))}
                </div>
              </div>
            )}

            {/* Suggestions */}
            {results.suggestions && results.suggestions.length > 0 && (
              <div>
                <h2 className="font-heading text-xl font-semibold mb-4">
                  Close Matches
                </h2>
                <div className="grid gap-4">
                  {results.suggestions.map((sug, idx) => (
                    <div key={idx} className="bg-white rounded-xl border border-border/60 p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Recipe Match: {sug.match_percentage}%</p>
                          {sug.missing_ingredients && sug.missing_ingredients.length > 0 && (
                            <p className="text-sm text-muted-foreground mt-1">
                              Missing: {sug.missing_ingredients.join(', ')}
                            </p>
                          )}
                        </div>
                        <Link to={`/recipes/${sug.recipe_id}`}>
                          <Button variant="outline" size="sm" className="rounded-full">
                            View Recipe
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI Suggestion */}
            {results.ai_recipe_suggestion && (
              <div className="bg-terracotta-light rounded-2xl border border-terracotta/20 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5 text-terracotta" />
                  <h2 className="font-heading text-lg font-semibold">AI Recipe Suggestion</h2>
                </div>
                <div className="bg-white rounded-xl p-4">
                  <h3 className="font-heading font-semibold text-lg">
                    {results.ai_recipe_suggestion.title || 'Suggested Recipe'}
                  </h3>
                  {results.ai_recipe_suggestion.description && (
                    <p className="text-muted-foreground mt-2">{results.ai_recipe_suggestion.description}</p>
                  )}
                  {results.ai_recipe_suggestion.ingredients && (
                    <div className="mt-4">
                      <p className="text-sm font-medium mb-2">Ingredients:</p>
                      <div className="flex flex-wrap gap-2">
                        {results.ai_recipe_suggestion.ingredients.map((ing, idx) => (
                          <span key={idx} className="px-2 py-1 bg-cream-subtle rounded text-sm">
                            {ing.amount} {ing.unit} {ing.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* No Results */}
            {results.matching_recipes.length === 0 && 
             (!results.suggestions || results.suggestions.length === 0) && 
             !results.ai_recipe_suggestion && (
              <div className="bg-white rounded-2xl border border-border/60 p-8 text-center">
                <ChefHat className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-heading text-lg font-semibold mb-2">No matching recipes</h3>
                <p className="text-muted-foreground mb-4">
                  Try adding more ingredients or create a new recipe!
                </p>
                <Link to="/recipes/new">
                  <Button className="rounded-full bg-sage hover:bg-sage-dark">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Recipe
                  </Button>
                </Link>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </Layout>
  );
};
