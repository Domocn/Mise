import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { configApi } from '../lib/api';
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
  LogOut,
  Plus,
  Link as LinkIcon,
  Settings,
  Sparkles,
  Globe,
  Moon,
  Sun
} from 'lucide-react';

const navItems = [
  { path: '/dashboard', label: 'Home', icon: Home },
  { path: '/recipes', label: 'Recipes', icon: UtensilsCrossed },
  { path: '/meal-planner', label: 'Meal Plan', icon: CalendarDays },
  { path: '/shopping', label: 'Shopping', icon: ShoppingCart },
  { path: '/fridge', label: 'My Fridge', icon: Refrigerator },
];

export const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [version, setVersion] = useState('1.0.0');
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mise_dark_mode');
      if (saved !== null) return saved === 'true';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    configApi.getConfig()
      .then(res => {
        if (res.data?.version) setVersion(res.data.version);
      })
      .catch((error) => {
        console.error('Failed to fetch config:', error);
      });
  }, []);

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('mise_dark_mode', String(newMode));
    if (newMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Get user initials for avatar
  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-border/40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
            <Link to="/dashboard" className="flex items-center gap-2 group" data-testid="logo-link">
              <div className="w-9 h-9 rounded-xl bg-sage flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                <ChefHat className="w-5 h-5 text-white" />
              </div>
              <span className="font-heading font-bold text-lg text-foreground hidden sm:block">
                Mise
              </span>
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-0.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-sage text-white shadow-sm'
                        : 'text-foreground/70 hover:text-foreground hover:bg-sage-light'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden lg:inline">{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {/* Add Recipe Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    className="rounded-full bg-sage hover:bg-sage-dark shadow-sm h-8 px-3"
                    data-testid="add-recipe-trigger"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline ml-1">Add</span>
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
                    className="rounded-full w-9 h-9 bg-terracotta/90 hover:bg-terracotta text-white font-medium text-sm"
                    data-testid="user-menu-trigger"
                  >
                    {getInitials(user?.name)}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 p-0">
                  {/* User Profile Header */}
                  <div className="px-4 py-3 border-b border-border/60">
                    <p className="font-semibold text-sm">{user?.name}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>

                  <div className="py-1">
                    {/* Language (placeholder for future) */}
                    <DropdownMenuItem className="py-2.5 px-4 cursor-pointer">
                      <Globe className="w-4 h-4 mr-3 text-muted-foreground" />
                      <div>
                        <p className="text-sm">Language</p>
                        <p className="text-xs text-muted-foreground">English</p>
                      </div>
                    </DropdownMenuItem>

                    {/* Theme Toggle */}
                    <DropdownMenuItem onClick={toggleDarkMode} className="py-2.5 px-4 cursor-pointer">
                      {darkMode ? (
                        <Sun className="w-4 h-4 mr-3 text-muted-foreground" />
                      ) : (
                        <Moon className="w-4 h-4 mr-3 text-muted-foreground" />
                      )}
                      <div>
                        <p className="text-sm">Theme</p>
                        <p className="text-xs text-muted-foreground">{darkMode ? 'Dark' : 'Light'}</p>
                      </div>
                    </DropdownMenuItem>

                    {/* Settings */}
                    <DropdownMenuItem onClick={() => navigate('/settings')} className="py-2.5 px-4 cursor-pointer" data-testid="menu-settings">
                      <Settings className="w-4 h-4 mr-3 text-muted-foreground" />
                      <div>
                        <p className="text-sm">Settings</p>
                        <p className="text-xs text-muted-foreground">Manage your account</p>
                      </div>
                    </DropdownMenuItem>
                  </div>

                  <DropdownMenuSeparator className="my-0" />

                  {/* Logout */}
                  <DropdownMenuItem onClick={handleLogout} className="py-2.5 px-4 cursor-pointer text-terracotta hover:text-terracotta" data-testid="menu-logout">
                    <LogOut className="w-4 h-4 mr-3" />
                    <span className="text-sm">Logout</span>
                  </DropdownMenuItem>

                  {/* Version Footer */}
                  <div className="px-4 py-2 border-t border-border/60">
                    <p className="text-xs text-muted-foreground text-right">v{version}</p>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden border-t border-border/40">
          <div className="flex justify-around py-1.5">
            {navItems.slice(0, 5).map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex flex-col items-center p-1.5 rounded-lg transition-colors ${
                    isActive ? 'text-sage' : 'text-muted-foreground'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-[10px] mt-0.5">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        {children}
      </main>
    </div>
  );
};
