import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { ChefHat, Mail, Lock, User, ArrowRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await login(email, password);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4">
      <motion.div 
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Logo */}
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="w-12 h-12 rounded-xl overflow-hidden shadow-sm">
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
          <span className="font-heading font-bold text-2xl">Mise</span>
        </Link>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-card border border-border/60 p-8">
          <div className="text-center mb-8">
            <h1 className="font-heading text-2xl font-bold">Welcome Back</h1>
            <p className="text-muted-foreground mt-2">Sign in to your account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 rounded-xl bg-cream-subtle border-transparent focus:border-mise"
                  required
                  data-testid="login-email"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 rounded-xl bg-cream-subtle border-transparent focus:border-mise"
                  required
                  data-testid="login-password"
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full rounded-full bg-mise hover:bg-mise-dark h-12"
              disabled={loading}
              data-testid="login-submit"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-mise hover:underline font-medium">
              Sign up
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await register(name, email, password);
      toast.success('Account created successfully!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4">
      <motion.div 
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Logo */}
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="w-12 h-12 rounded-xl overflow-hidden shadow-sm">
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
          <span className="font-heading font-bold text-2xl">Mise</span>
        </Link>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-card border border-border/60 p-8">
          <div className="text-center mb-8">
            <h1 className="font-heading text-2xl font-bold">Create Account</h1>
            <p className="text-muted-foreground mt-2">Start organizing your recipes</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="name"
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-10 rounded-xl bg-cream-subtle border-transparent focus:border-mise"
                  required
                  data-testid="register-name"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 rounded-xl bg-cream-subtle border-transparent focus:border-mise"
                  required
                  data-testid="register-email"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 rounded-xl bg-cream-subtle border-transparent focus:border-mise"
                  required
                  minLength={6}
                  data-testid="register-password"
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full rounded-full bg-mise hover:bg-mise-dark h-12"
              disabled={loading}
              data-testid="register-submit"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Create Account
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-mise hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};
