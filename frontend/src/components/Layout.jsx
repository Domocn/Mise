import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { 
  ChefHat, 
  Home, 
  UtensilsCrossed, 
  CalendarDays, 
  ShoppingCart, 
  Refrigerator,
  Users,
  LogOut,
  User,
  Plus,
  Link as LinkIcon,
  Server,
  Sparkles
} from 'lucide-react';

const navItems = [
  { path: '/dashboard', label: 'Home', icon: Home },
  { path: '/recipes', label: 'Recipes', icon: UtensilsCrossed },
  { path: '/meal-planner', label: 'Meal Plan', icon: CalendarDays },
  { path: '/shopping', label: 'Shopping', icon: ShoppingCart },
  { path: '/fridge', label: 'My Fridge', icon: Refrigerator },
];

export const Layout = ({ children }) => {
  const { user, household, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-border/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/dashboard" className="flex items-center gap-2 group" data-testid="logo-link">
              <div className="w-10 h-10 rounded-xl bg-sage flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                <ChefHat className="w-6 h-6 text-white" />
              </div>
              <span className="font-heading font-bold text-xl text-foreground hidden sm:block">
                Mise
              </span>
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-sage text-white shadow-sm'
                        : 'text-foreground/70 hover:text-foreground hover:bg-sage-light'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-3">
              {/* Add Recipe Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    size="sm" 
                    className="rounded-full bg-sage hover:bg-sage-dark shadow-sm"
                    data-testid="add-recipe-trigger"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    <span className="hidden sm:inline">Add Recipe</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => navigate('/recipes/quick-add')} data-testid="add-recipe-quick">
                    <Sparkles className="w-4 h-4 mr-2" />
                    Paste & Go
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/recipes/new')} data-testid="add-recipe-manual">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Manually
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/recipes/import')} data-testid="add-recipe-import">
                    <LinkIcon className="w-4 h-4 mr-2" />
                    Import from URL
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="rounded-full w-10 h-10 bg-sage-light"
                    data-testid="user-menu-trigger"
                  >
                    <User className="w-5 h-5 text-sage" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-3 py-2">
                    <p className="font-medium text-sm">{user?.name}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                    {household && (
                      <p className="text-xs text-sage mt-1">{household.name}</p>
                    )}
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/household')} data-testid="menu-household">
                    <Users className="w-4 h-4 mr-2" />
                    {household ? 'My Household' : 'Create Household'}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/settings')} data-testid="menu-settings">
                    <Server className="w-4 h-4 mr-2" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive" data-testid="menu-logout">
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden border-t border-border/40">
          <div className="flex justify-around py-2">
            {navItems.slice(0, 5).map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex flex-col items-center p-2 rounded-lg transition-colors ${
                    isActive ? 'text-sage' : 'text-muted-foreground'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs mt-1">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
};
