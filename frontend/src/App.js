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
        <div style={{ minHeight: '100vh', background: 'orange', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '32px', maxWidth: '500px', textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: 'red', marginBottom: '16px' }}>ERROR CAUGHT!</h1>
            <p style={{ color: '#333', marginBottom: '16px' }}>
              {this.state.error?.message || 'Unknown error'}
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{ padding: '12px 24px', background: 'blue', color: 'white', borderRadius: '999px', border: 'none', cursor: 'pointer', fontSize: '16px' }}
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

// Debug component to show auth state - ALWAYS visible for debugging
const AuthDebug = () => {
  const { isAuthenticated, loading, user } = useAuth();

  return (
    <div style={{
      position: 'fixed',
      top: '0',
      left: '0',
      right: '0',
      background: 'red',
      color: 'white',
      padding: '20px',
      fontSize: '18px',
      zIndex: 2147483647,
      fontFamily: 'monospace',
      fontWeight: 'bold',
      textAlign: 'center'
    }}>
      DEBUG: Loading={loading ? 'TRUE' : 'FALSE'} | Auth={isAuthenticated ? 'TRUE' : 'FALSE'} | User={user ? user.email : 'NULL'}
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
      {/* Debug OUTSIDE AuthProvider - should ALWAYS show if React works */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        background: 'blue',
        color: 'yellow',
        padding: '10px',
        fontSize: '20px',
        fontWeight: 'bold',
        zIndex: 2147483647,
        textAlign: 'center'
      }}>
        BLUE BAR = React is working
      </div>
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
