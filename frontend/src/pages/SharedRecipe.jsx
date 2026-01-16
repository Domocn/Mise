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
        <Loader2 className="w-8 h-8 animate-spin text-mise" />
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
            <Button className="rounded-full bg-mise hover:bg-mise-dark">
              Go to Mise
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
            <div className="w-8 h-8 rounded-lg overflow-hidden">
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <rect width="100" height="100" fill="#6C5CE7" />
                <g stroke="#FFFFFF" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.9">
                  <path d="M35 25 Q32 20 35 15 Q38 10 35 5"/>
                  <path d="M50 22 Q47 17 50 12 Q53 7 50 2"/>
                  <path d="M65 25 Q62 20 65 15 Q68 10 65 5"/>
                </g>
                <g fill="#FFFFFF">
                  <rect x="12" y="43" width="10" height="4" rx="2"/>
                  <rect x="78" y="43" width="10" height="4" rx="2"/>
                </g>
                <path d="M20 38 L80 38 L80 42 L78 72 C77 78 72 82 65 82 L35 82 C28 82 23 78 22 72 L20 42 Z" fill="#FFFFFF"/>
                <rect x="18" y="35" width="64" height="8" rx="2" fill="#FFFFFF"/>
                <circle cx="35" cy="55" r="6" fill="#FFD93D"/>
                <circle cx="52" cy="50" r="6" fill="#FF6B6B"/>
                <circle cx="67" cy="55" r="5" fill="#00D2D3"/>
                <circle cx="42" cy="68" r="5" fill="#FF9F43"/>
                <circle cx="58" cy="65" r="4" fill="#A29BFE"/>
              </svg>
            </div>
            <span className="font-heading font-bold">Mise</span>
          </Link>
          <Link to="/register">
            <Button variant="outline" size="sm" className="rounded-full">
              Join Mise
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
                  <Clock className="w-5 h-5 text-mise" />
                  <div>
                    <p className="text-xs text-muted-foreground">Total Time</p>
                    <p className="font-medium">{formatTime(totalTime)}</p>
                  </div>
                </div>
              )}
              {recipe.servings > 0 && (
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-mise" />
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
                    className="px-3 py-1 rounded-full bg-mise-light text-mise text-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Ingredients */}
            <section className="mb-8">
              <h2 className="font-heading text-xl font-semibold mb-4 flex items-center gap-2">
                <ChefHat className="w-5 h-5 text-mise" />
                Ingredients
              </h2>
              <ul className="space-y-2">
                {recipe.ingredients.map((ing, idx) => (
                  <li key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-cream-subtle">
                    <span className="w-2 h-2 rounded-full bg-mise mt-2 flex-shrink-0" />
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
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-mise text-white flex items-center justify-center font-semibold text-sm">
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
                <Button className="rounded-full bg-mise hover:bg-mise-dark">
                  Join Mise Free
                </Button>
              </Link>
            </div>
          </div>
        </motion.article>
      </main>
    </div>
  );
};
