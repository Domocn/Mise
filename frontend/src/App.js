import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from './context/AuthContext';
import { InstallPrompt } from './components/InstallPrompt';

// Error Boundary to catch React render errors
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('React Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-cream flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md text-center shadow-lg">
            <h1 className="text-xl font-bold text-gray-900 mb-4">Something went wrong</h1>
            <p className="text-gray-600 mb-6">
              The app encountered an error. Please try refreshing the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-mise text-white rounded-full hover:bg-mise-dark transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Pages
import { Landing } from './pages/Landing';
import { Login, Register } from './pages/Auth';
import { Dashboard } from './pages/Dashboard';
import { Recipes } from './pages/Recipes';
import { RecipeDetail } from './pages/RecipeDetail';
import { RecipeForm } from './pages/RecipeForm';
import { ImportRecipe } from './pages/ImportRecipe';
import { MealPlanner } from './pages/MealPlanner';
import { ShoppingLists } from './pages/ShoppingLists';
import { FridgeSearch } from './pages/FridgeSearch';
import { Household } from './pages/Household';
import { ServerConfig } from './pages/ServerConfig';
import { Settings } from './pages/Settings';
import { QuickAddRecipe } from './pages/QuickAddRecipe';
import { SharedRecipe } from './pages/SharedRecipe';
import { ImportFromPlatform } from './pages/ImportFromPlatform';

import './App.css';

// Debug component to show auth state
const AuthDebug = () => {
  const { isAuthenticated, loading, user } = useAuth();

  // Only show in development or if there's an issue
  if (process.env.NODE_ENV === 'production' && !loading && isAuthenticated) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '10px',
      left: '10px',
      background: '#333',
      color: '#fff',
      padding: '10px',
      borderRadius: '8px',
      fontSize: '12px',
      zIndex: 9999,
      fontFamily: 'monospace'
    }}>
      <div>Loading: {loading ? 'true' : 'false'}</div>
      <div>Auth: {isAuthenticated ? 'true' : 'false'}</div>
      <div>User: {user ? user.email : 'null'}</div>
    </div>
  );
};

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  console.log('[ProtectedRoute] loading:', loading, 'isAuthenticated:', isAuthenticated);

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-mise border-t-transparent rounded-full animate-spin" />
        <span className="ml-4 text-gray-600">Loading auth...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Public Route - redirects to dashboard if logged in
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-mise border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<PublicRoute><Landing /></PublicRoute>} />
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
      <Route path="/server" element={<ServerConfig />} />
      <Route path="/shared/:shareId" element={<SharedRecipe />} />
      
      {/* Protected Routes */}
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/recipes" element={<ProtectedRoute><Recipes /></ProtectedRoute>} />
      <Route path="/recipes/new" element={<ProtectedRoute><RecipeForm /></ProtectedRoute>} />
      <Route path="/recipes/quick-add" element={<ProtectedRoute><QuickAddRecipe /></ProtectedRoute>} />
      <Route path="/recipes/import" element={<ProtectedRoute><ImportRecipe /></ProtectedRoute>} />
      <Route path="/recipes/import-batch" element={<ProtectedRoute><ImportFromPlatform /></ProtectedRoute>} />
      <Route path="/recipes/:id" element={<ProtectedRoute><RecipeDetail /></ProtectedRoute>} />
      <Route path="/recipes/:id/edit" element={<ProtectedRoute><RecipeForm /></ProtectedRoute>} />
      <Route path="/meal-planner" element={<ProtectedRoute><MealPlanner /></ProtectedRoute>} />
      <Route path="/shopping" element={<ProtectedRoute><ShoppingLists /></ProtectedRoute>} />
      <Route path="/fridge" element={<ProtectedRoute><FridgeSearch /></ProtectedRoute>} />
      <Route path="/household" element={<ProtectedRoute><Household /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      
      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <AuthDebug />
          <AppRoutes />
          <InstallPrompt />
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: '#FFFFFF',
                border: '1px solid #E6E2D6',
                borderRadius: '1rem',
              },
              className: 'font-sans',
            }}
          />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
