import { supabase } from './supabase';

export const recipeApi = {
  getAll: async (params = {}) => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('household_id')
      .eq('id', (await supabase.auth.getUser()).data.user.id)
      .maybeSingle();

    if (!profile?.household_id) {
      return { data: [] };
    }

    let query = supabase
      .from('recipes')
      .select(`
        *,
        category:categories(name),
        favorites(id)
      `)
      .eq('household_id', profile.household_id)
      .order('created_at', { ascending: false });

    if (params.category) {
      query = query.eq('category_id', params.category);
    }

    if (params.search) {
      query = query.ilike('title', `%${params.search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    return {
      data: data.map(recipe => ({
        ...recipe,
        is_favorite: recipe.favorites?.length > 0,
        category_name: recipe.category?.name
      }))
    };
  },

  getOne: async (id) => {
    const { data, error } = await supabase
      .from('recipes')
      .select(`
        *,
        category:categories(name),
        favorites(id)
      `)
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;

    return {
      data: {
        ...data,
        is_favorite: data.favorites?.length > 0,
        category_name: data.category?.name
      }
    };
  },

  create: async (recipeData) => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('household_id')
      .eq('id', (await supabase.auth.getUser()).data.user.id)
      .maybeSingle();

    const { data, error } = await supabase
      .from('recipes')
      .insert({
        ...recipeData,
        household_id: profile.household_id,
        created_by: (await supabase.auth.getUser()).data.user.id
      })
      .select()
      .single();

    if (error) throw error;
    return { data };
  },

  update: async (id, recipeData) => {
    const { data, error } = await supabase
      .from('recipes')
      .update(recipeData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { data };
  },

  delete: async (id) => {
    const { error } = await supabase
      .from('recipes')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { data: { success: true } };
  },

  uploadImage: async (id, file) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${id}-${Date.now()}.${fileExt}`;
    const filePath = `recipe-images/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('recipes')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('recipes')
      .getPublicUrl(filePath);

    await supabase
      .from('recipes')
      .update({ image_url: publicUrl })
      .eq('id', id);

    return { data: { image_url: publicUrl } };
  },

  toggleFavorite: async (id) => {
    const userId = (await supabase.auth.getUser()).data.user.id;

    const { data: existing } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('recipe_id', id)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('id', existing.id);

      if (error) throw error;
      return { data: { is_favorite: false } };
    } else {
      const { error } = await supabase
        .from('favorites')
        .insert({ user_id: userId, recipe_id: id });

      if (error) throw error;
      return { data: { is_favorite: true } };
    }
  },

  getScaled: async (id, servings) => {
    const { data } = await recipeApi.getOne(id);
    const scale = servings / data.servings;

    const scaledIngredients = data.ingredients.map(ing => ({
      ...ing,
      amount: ing.amount ? (parseFloat(ing.amount) * scale).toFixed(2) : ing.amount
    }));

    return {
      data: {
        ...data,
        servings,
        ingredients: scaledIngredients
      }
    };
  },

  getPrint: async (id) => {
    return recipeApi.getOne(id);
  }
};

export const favoritesApi = {
  getAll: async () => {
    const userId = (await supabase.auth.getUser()).data.user.id;

    const { data, error } = await supabase
      .from('favorites')
      .select(`
        *,
        recipe:recipes(
          *,
          category:categories(name)
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return {
      data: data.map(fav => ({
        ...fav.recipe,
        is_favorite: true,
        category_name: fav.recipe.category?.name
      }))
    };
  }
};

export const mealPlanApi = {
  getAll: async (params = {}) => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('household_id')
      .eq('id', (await supabase.auth.getUser()).data.user.id)
      .maybeSingle();

    if (!profile?.household_id) {
      return { data: [] };
    }

    let query = supabase
      .from('meal_plans')
      .select(`
        *,
        recipe:recipes(id, title, image_url)
      `)
      .eq('household_id', profile.household_id)
      .order('date', { ascending: true });

    if (params.start_date) {
      query = query.gte('date', params.start_date);
    }

    if (params.end_date) {
      query = query.lte('date', params.end_date);
    }

    const { data, error } = await query;
    if (error) throw error;

    return {
      data: data.map(plan => ({
        ...plan,
        recipe_title: plan.recipe?.title,
        recipe_image: plan.recipe?.image_url
      }))
    };
  },

  create: async (planData) => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('household_id')
      .eq('id', (await supabase.auth.getUser()).data.user.id)
      .maybeSingle();

    const { data, error } = await supabase
      .from('meal_plans')
      .insert({
        ...planData,
        household_id: profile.household_id
      })
      .select()
      .single();

    if (error) throw error;
    return { data };
  },

  delete: async (id) => {
    const { error } = await supabase
      .from('meal_plans')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { data: { success: true } };
  }
};

export const shoppingListApi = {
  getAll: async () => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('household_id')
      .eq('id', (await supabase.auth.getUser()).data.user.id)
      .maybeSingle();

    if (!profile?.household_id) {
      return { data: [] };
    }

    const { data, error } = await supabase
      .from('shopping_lists')
      .select('*')
      .eq('household_id', profile.household_id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data };
  },

  getOne: async (id) => {
    const { data, error } = await supabase
      .from('shopping_lists')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return { data };
  },

  create: async (listData) => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('household_id')
      .eq('id', (await supabase.auth.getUser()).data.user.id)
      .maybeSingle();

    const userId = (await supabase.auth.getUser()).data.user.id;

    const { data, error } = await supabase
      .from('shopping_lists')
      .insert({
        ...listData,
        household_id: profile.household_id,
        created_by: userId
      })
      .select()
      .single();

    if (error) throw error;
    return { data };
  },

  update: async (id, listData) => {
    const { data, error } = await supabase
      .from('shopping_lists')
      .update(listData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { data };
  },

  delete: async (id) => {
    const { error } = await supabase
      .from('shopping_lists')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { data: { success: true } };
  },

  fromRecipes: async (recipeIds) => {
    const items = [];

    for (const recipeId of recipeIds) {
      const { data: recipe } = await recipeApi.getOne(recipeId);
      if (recipe && recipe.ingredients) {
        recipe.ingredients.forEach(ing => {
          items.push({
            name: ing.item || ing.name,
            amount: ing.amount,
            unit: ing.unit,
            checked: false
          });
        });
      }
    }

    return shoppingListApi.create({
      name: `Shopping List ${new Date().toLocaleDateString()}`,
      items,
      completed: false
    });
  }
};

export const categoryApi = {
  getAll: async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name');

    if (error) throw error;
    return { data };
  }
};

export const householdApi = {
  create: async (householdData) => {
    const userId = (await supabase.auth.getUser()).data.user.id;

    const { data, error } = await supabase
      .from('households')
      .insert({
        ...householdData,
        owner_id: userId
      })
      .select()
      .single();

    if (error) throw error;

    await supabase
      .from('profiles')
      .update({ household_id: data.id })
      .eq('id', userId);

    return { data };
  },

  getMy: async () => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('household_id')
      .eq('id', (await supabase.auth.getUser()).data.user.id)
      .maybeSingle();

    if (!profile?.household_id) {
      return { data: null };
    }

    const { data, error } = await supabase
      .from('households')
      .select('*')
      .eq('id', profile.household_id)
      .maybeSingle();

    if (error) throw error;
    return { data };
  },

  getMembers: async () => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('household_id')
      .eq('id', (await supabase.auth.getUser()).data.user.id)
      .maybeSingle();

    if (!profile?.household_id) {
      return { data: [] };
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, email')
      .eq('household_id', profile.household_id);

    if (error) throw error;
    return { data };
  },

  invite: async (email) => {
    return { data: { message: 'Invite functionality not yet implemented' } };
  },

  leave: async () => {
    const userId = (await supabase.auth.getUser()).data.user.id;

    const { error } = await supabase
      .from('profiles')
      .update({ household_id: null })
      .eq('id', userId);

    if (error) throw error;
    return { data: { success: true } };
  }
};

export const shareApi = {
  createLink: async (recipeId) => {
    const shareId = Math.random().toString(36).substring(2, 15);

    const { data, error } = await supabase
      .from('shared_recipes')
      .insert({
        recipe_id: recipeId,
        share_id: shareId
      })
      .select()
      .single();

    if (error) throw error;
    return { data };
  },

  getShared: async (shareId) => {
    const { data: sharedRecipe, error: shareError } = await supabase
      .from('shared_recipes')
      .select(`
        *,
        recipe:recipes(
          *,
          category:categories(name)
        )
      `)
      .eq('share_id', shareId)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (shareError) throw shareError;
    if (!sharedRecipe) throw new Error('Shared recipe not found or expired');

    return {
      data: {
        ...sharedRecipe.recipe,
        category_name: sharedRecipe.recipe.category?.name
      }
    };
  }
};

export const aiApi = {
  importUrl: async (url) => {
    throw new Error('AI functionality requires Edge Function implementation');
  },

  importText: async (text) => {
    throw new Error('AI functionality requires Edge Function implementation');
  },

  fridgeSearch: async (ingredients, searchOnline = false) => {
    throw new Error('AI functionality requires Edge Function implementation');
  },

  autoMealPlan: async (days = 7, preferences = '', excludeRecipes = []) => {
    throw new Error('AI functionality requires Edge Function implementation');
  }
};

export const calendarApi = {
  exportIcal: async (startDate, endDate) => {
    throw new Error('Calendar export requires Edge Function implementation');
  }
};

export const importApi = {
  fromPlatform: async (platform, data) => {
    throw new Error('Import functionality requires Edge Function implementation');
  }
};

export const notificationApi = {
  subscribe: async (subscription) => {
    return { data: { success: true } };
  },

  getSettings: async () => {
    return { data: { enabled: false } };
  },

  updateSettings: async (settings) => {
    return { data: settings };
  }
};

export const llmApi = {
  getSettings: async () => {
    return { data: { provider: 'none' } };
  },

  updateSettings: async (settings) => {
    return { data: settings };
  },

  testConnection: async (settings) => {
    return { data: { success: false, message: 'LLM integration requires Edge Functions' } };
  }
};

export const configApi = {
  getConfig: async () => {
    return { data: { version: '2.0', backend: 'supabase' } };
  },

  healthCheck: async () => {
    const { error } = await supabase.from('profiles').select('id').limit(1);
    return { data: { status: error ? 'unhealthy' : 'healthy' } };
  }
};

export default {
  recipeApi,
  favoritesApi,
  mealPlanApi,
  shoppingListApi,
  categoryApi,
  householdApi,
  shareApi,
  aiApi,
  calendarApi,
  importApi,
  notificationApi,
  llmApi,
  configApi
};
