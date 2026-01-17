import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { shareApi } from '../lib/api';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { getImageUrl, formatTime } from '../lib/utils';
import { 
  Clock, 
  Users, 
  ChefHat,
  Loader2,
  AlertCircle,
  ExternalLink
} from 'lucide-react';

export const SharedRecipe = () => {
  const { shareId } = useParams();
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadRecipe();
  }, [shareId]);

  const loadRecipe = async () => {
    try {
      const res = await shareApi.getShared(shareId);
      setRecipe(res.data);
    } catch (error) {
      setError(error.response?.data?.detail || 'Recipe not found or link expired');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-sage" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="font-heading text-2xl font-bold mb-2">Recipe Not Found</h1>
          <p className="text-muted-foreground mb-6">{error}</p>
          <Link to="/">
            <Button className="rounded-full bg-sage hover:bg-sage-dark">
              Go to Kitchenry
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const totalTime = (recipe.prep_time || 0) + (recipe.cook_time || 0);

  return (
    <div className="min-h-screen bg-cream" data-testid="shared-recipe">
      {/* Header */}
      <header className="bg-white border-b border-border/40 py-4">
        <div className="max-w-4xl mx-auto px-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sage flex items-center justify-center">
              <ChefHat className="w-4 h-4 text-white" />
            </div>
            <span className="font-heading font-bold">Kitchenry</span>
          </Link>
          <Link to="/register">
            <Button variant="outline" size="sm" className="rounded-full">
              Join Kitchenry
              <ExternalLink className="w-3 h-3 ml-2" />
            </Button>
          </Link>
        </div>
      </header>

      {/* Recipe Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <motion.article
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-border/60 overflow-hidden shadow-card"
        >
          {/* Hero Image */}
          <div className="relative aspect-video">
            <img
              src={getImageUrl(recipe.image_url)}
              alt={recipe.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
            <Badge className="absolute top-4 left-4 bg-white/90 text-foreground">
              {recipe.category}
            </Badge>
          </div>

          <div className="p-6 md:p-8">
            {/* Header */}
            <h1 className="font-heading text-3xl font-bold text-foreground mb-2">
              {recipe.title}
            </h1>
            {recipe.description && (
              <p className="text-muted-foreground mb-6">{recipe.description}</p>
            )}

            {/* Meta Info */}
            <div className="flex flex-wrap gap-6 mb-8 pb-8 border-b border-border/60">
              {totalTime > 0 && (
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-sage" />
                  <div>
                    <p className="text-xs text-muted-foreground">Total Time</p>
                    <p className="font-medium">{formatTime(totalTime)}</p>
                  </div>
                </div>
              )}
              {recipe.servings > 0 && (
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-sage" />
                  <div>
                    <p className="text-xs text-muted-foreground">Servings</p>
                    <p className="font-medium">{recipe.servings}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Tags */}
            {recipe.tags && recipe.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-8">
                {recipe.tags.map((tag, idx) => (
                  <span 
                    key={idx}
                    className="px-3 py-1 rounded-full bg-sage-light text-sage text-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Ingredients */}
            <section className="mb-8">
              <h2 className="font-heading text-xl font-semibold mb-4 flex items-center gap-2">
                <ChefHat className="w-5 h-5 text-sage" />
                Ingredients
              </h2>
              <ul className="space-y-2">
                {recipe.ingredients.map((ing, idx) => (
                  <li key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-cream-subtle">
                    <span className="w-2 h-2 rounded-full bg-sage mt-2 flex-shrink-0" />
                    <span>
                      <span className="font-medium">{ing.amount}</span>
                      {ing.unit && <span className="text-muted-foreground"> {ing.unit}</span>}
                      <span> {ing.name}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            {/* Instructions */}
            <section>
              <h2 className="font-heading text-xl font-semibold mb-4">Instructions</h2>
              <ol className="space-y-4">
                {recipe.instructions.map((step, idx) => (
                  <li key={idx} className="flex gap-4">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-sage text-white flex items-center justify-center font-semibold text-sm">
                      {idx + 1}
                    </span>
                    <p className="pt-1">{step}</p>
                  </li>
                ))}
              </ol>
            </section>

            {/* CTA */}
            <div className="mt-8 pt-8 border-t border-border/60 text-center">
              <p className="text-muted-foreground mb-4">
                Want to save this recipe and plan your meals?
              </p>
              <Link to="/register">
                <Button className="rounded-full bg-sage hover:bg-sage-dark">
                  Join Kitchenry Free
                </Button>
              </Link>
            </div>
          </div>
        </motion.article>
      </main>
    </div>
  );
};
