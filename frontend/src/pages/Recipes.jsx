import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Layout } from '../components/Layout';
import { RecipeCard } from '../components/RecipeCard';
import { recipeApi } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { CATEGORIES } from '../lib/utils';
import { Plus, Search, Filter, Link as LinkIcon, Heart, Download } from 'lucide-react';
import { toast } from 'sonner';

export const Recipes = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [category, setCategory] = useState(searchParams.get('category') || 'All');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(searchParams.get('favorites') === 'true');

  useEffect(() => {
    loadRecipes();
  }, [category, showFavoritesOnly]);

  const loadRecipes = async () => {
    try {
      setLoading(true);
      const params = {};
      if (category !== 'All') params.category = category;
      if (search) params.search = search;
      if (showFavoritesOnly) params.favorites_only = true;
      
      const res = await recipeApi.getAll(params);
      setRecipes(res.data);
    } catch (error) {
      toast.error('Failed to load recipes');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    loadRecipes();
    setSearchParams({ search, category, favorites: showFavoritesOnly });
  };

  const handleCategoryChange = (cat) => {
    setCategory(cat);
    setSearchParams({ search, category: cat, favorites: showFavoritesOnly });
  };

  const handleToggleFavorites = () => {
    setShowFavoritesOnly(!showFavoritesOnly);
    setSearchParams({ search, category, favorites: !showFavoritesOnly });
  };

  return (
    <Layout>
      <div className="space-y-8" data-testid="recipes-page">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
        >
          <div>
            <h1 className="font-heading text-3xl font-bold">
              {showFavoritesOnly ? 'Favorite Recipes' : 'Recipes'}
            </h1>
            <p className="text-muted-foreground mt-1">
              {recipes.length} recipe{recipes.length !== 1 ? 's' : ''} {showFavoritesOnly ? 'favorited' : 'in your collection'}
            </p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <Button 
              variant={showFavoritesOnly ? "default" : "outline"} 
              className={`rounded-full ${showFavoritesOnly ? 'bg-red-500 hover:bg-red-600' : ''}`}
              onClick={handleToggleFavorites}
              data-testid="favorites-filter-btn"
            >
              <Heart className={`w-4 h-4 mr-2 ${showFavoritesOnly ? 'fill-current' : ''}`} />
              Favorites
            </Button>
            <Link to="/recipes/import-batch">
              <Button variant="outline" className="rounded-full" data-testid="import-batch-btn">
                <Download className="w-4 h-4 mr-2" />
                Import
              </Button>
            </Link>
            <Link to="/recipes/import">
              <Button variant="outline" className="rounded-full" data-testid="import-recipe-btn">
                <LinkIcon className="w-4 h-4 mr-2" />
                Import URL
              </Button>
            </Link>
            <Link to="/recipes/new">
              <Button className="rounded-full bg-mise hover:bg-mise-dark" data-testid="new-recipe-btn">
                <Plus className="w-4 h-4 mr-2" />
                New Recipe
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Search & Filter */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-4"
        >
          {/* Search */}
          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search recipes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 rounded-xl bg-white border-border/60"
                data-testid="recipe-search"
              />
            </div>
            <Button type="submit" variant="outline" className="rounded-xl" data-testid="recipe-search-btn">
              Search
            </Button>
          </form>

          {/* Categories */}
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => handleCategoryChange(cat)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  category === cat
                    ? 'bg-mise text-white shadow-sm'
                    : 'bg-white text-foreground border border-border/60 hover:bg-mise-light'
                }`}
                data-testid={`category-${cat.toLowerCase()}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Recipe Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-2xl h-80 animate-pulse" />
            ))}
          </div>
        ) : recipes.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white rounded-2xl border border-border/60 p-12 text-center"
          >
            <div className="w-16 h-16 rounded-full bg-mise-light mx-auto mb-4 flex items-center justify-center">
              <Search className="w-8 h-8 text-mise" />
            </div>
            <h3 className="font-heading text-lg font-semibold mb-2">No recipes found</h3>
            <p className="text-muted-foreground mb-6">
              {search || category !== 'All' 
                ? 'Try adjusting your search or filters'
                : 'Start adding recipes to your collection'}
            </p>
            <Link to="/recipes/new">
              <Button className="rounded-full bg-mise hover:bg-mise-dark">
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Recipe
              </Button>
            </Link>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          >
            {recipes.map((recipe, index) => (
              <motion.div
                key={recipe.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <RecipeCard recipe={recipe} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </Layout>
  );
};
