import axios from 'axios';

// Get server URL - check localStorage first, then runtime config, then build-time env, then fallback
const getServerUrl = () => {
  // Priority 1: User configured URL (from server config page)
  const savedUrl = localStorage.getItem('mise_server_url');
  if (savedUrl) {
    console.log('[Mise Config] Using localStorage URL:', savedUrl);
    return savedUrl;
  }

  // Priority 2: Runtime environment variable (injected at container startup via config.js)
  if (window._env_ && window._env_.REACT_APP_BACKEND_URL) {
    const runtimeUrl = window._env_.REACT_APP_BACKEND_URL;
    // Check if it's a valid URL (not a placeholder)
    if (runtimeUrl && !runtimeUrl.startsWith('__') && runtimeUrl.startsWith('http')) {
      console.log('[Mise Config] Using runtime config URL:', runtimeUrl);
      return runtimeUrl;
    } else {
      console.warn('[Mise Config] Runtime config present but invalid:', runtimeUrl);
    }
  } else {
    console.warn('[Mise Config] No runtime config found. window._env_ =', window._env_);
  }

  // Priority 3: Build-time environment variable (for local development)
  if (process.env.REACT_APP_BACKEND_URL && !process.env.REACT_APP_BACKEND_URL.startsWith('__')) {
    console.log('[Mise Config] Using build-time env URL:', process.env.REACT_APP_BACKEND_URL);
    return process.env.REACT_APP_BACKEND_URL;
  }

  // Priority 4: Empty (will trigger server config page)
  console.warn('[Mise Config] No backend URL configured, will redirect to /server');
  return '';
};

// Check if server is configured
const isServerConfigured = () => {
  const url = getServerUrl();
  return url && url.length > 0;
};

const api = axios.create({
  baseURL: getServerUrl() + '/api',
});

api.interceptors.request.use((config) => {
  if (!isServerConfigured()) {
    if (window.location.pathname !== '/server' && window.location.pathname !== '/') {
      console.warn('Server not configured, redirecting to server config page');
      window.location.href = '/server';
    }
    return Promise.reject(new Error('Server not configured. Please configure your server URL.'));
  }

  const currentUrl = getServerUrl();
  if (currentUrl) {
    config.baseURL = currentUrl + '/api';
  }

  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/me', data),
  deleteAccount: () => api.delete('/auth/me'),
};

// Households
export const householdApi = {
  create: (data) => api.post('/households', data),
  getMy: () => api.get('/households/me'),
  getMembers: () => api.get('/households/members'),
  invite: (email) => api.post('/households/invite', { email }),
  leave: () => api.post('/households/leave'),
  generateJoinCode: () => api.post('/households/join-code'),
  revokeJoinCode: () => api.delete('/households/join-code'),
  joinWithCode: (code) => api.post('/households/join', { join_code: code }),
};

// Recipes
export const recipeApi = {
  getAll: (params) => api.get('/recipes', { params }),
  getOne: (id) => api.get(`/recipes/${id}`),
  create: (data) => api.post('/recipes', data),
  update: (id, data) => api.put(`/recipes/${id}`, data),
  delete: (id) => api.delete(`/recipes/${id}`),
  uploadImage: (id, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/recipes/${id}/image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  toggleFavorite: (id) => api.post(`/recipes/${id}/favorite`),
  getScaled: (id, servings) => api.get(`/recipes/${id}/scaled`, { params: { servings } }),
  getPrint: (id) => api.get(`/recipes/${id}/print`),
};

// Favorites
export const favoritesApi = {
  getAll: () => api.get('/favorites'),
};

// AI
export const aiApi = {
  importUrl: (url) => api.post('/ai/import-url', { url }),
  importText: (text) => api.post('/ai/import-text', { text }),
  fridgeSearch: (ingredients, searchOnline = false) =>
    api.post('/ai/fridge-search', { ingredients, search_online: searchOnline }),
  autoMealPlan: (days = 7, preferences = '', excludeRecipes = []) =>
    api.post('/ai/auto-meal-plan', { days, preferences, exclude_recipes: excludeRecipes }),
};

// Meal Plans
export const mealPlanApi = {
  getAll: (params) => api.get('/meal-plans', { params }),
  create: (data) => api.post('/meal-plans', data),
  delete: (id) => api.delete(`/meal-plans/${id}`),
};

// Shopping Lists
export const shoppingListApi = {
  getAll: () => api.get('/shopping-lists'),
  getOne: (id) => api.get(`/shopping-lists/${id}`),
  create: (data) => api.post('/shopping-lists', data),
  update: (id, data) => api.put(`/shopping-lists/${id}`, data),
  delete: (id) => api.delete(`/shopping-lists/${id}`),
  fromRecipes: (recipeIds) => api.post('/shopping-lists/from-recipes', recipeIds),
};

// Categories
export const categoryApi = {
  getAll: () => api.get('/categories'),
};

// Sharing
export const shareApi = {
  createLink: (recipeId) => api.post(`/recipes/${recipeId}/share`),
  getShared: (shareId) => api.get(`/shared/${shareId}`),
};

// Calendar
export const calendarApi = {
  exportIcal: (startDate, endDate) => 
    api.get('/calendar/ical', { params: { start_date: startDate, end_date: endDate }, responseType: 'blob' }),
};

// Import
export const importApi = {
  fromPlatform: (platform, data) => api.post('/import/platform', { platform, data }),
};

// Notifications
export const notificationApi = {
  subscribe: (subscription) => api.post('/notifications/subscribe', subscription),
  getSettings: () => api.get('/notifications/settings'),
  updateSettings: (settings) => api.put('/notifications/settings', settings),
};

// LLM Settings
export const llmApi = {
  getSettings: () => api.get('/settings/llm'),
  updateSettings: (settings) => api.put('/settings/llm', settings),
  testConnection: (settings) => api.post('/settings/llm/test', settings),
};

// Custom AI Prompts
export const promptsApi = {
  get: () => api.get('/prompts'),
  update: (prompts) => api.put('/prompts', prompts),
  reset: () => api.delete('/prompts'),
};

// Cooking (Tonight suggestions, Cook Mode, Feedback)
export const cookingApi = {
  getTonightSuggestions: () => api.get('/cooking/tonight'),
  startSession: (recipeId) => api.post('/cooking/session', { recipe_id: recipeId }),
  completeSession: (sessionId, feedback) => api.post(`/cooking/session/${sessionId}/complete`, { feedback }),
  submitFeedback: (recipeId, feedback) => api.post('/cooking/feedback', { recipe_id: recipeId, feedback }),
  getStats: () => api.get('/cooking/stats'),
};

// Server Config
export const configApi = {
  getConfig: () => api.get('/config'),
  healthCheck: () => api.get('/health'),
};

export default api;
