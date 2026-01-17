import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Layout } from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { configApi, llmApi, notificationApi } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { 
  Settings as SettingsIcon, 
  Server, 
  User, 
  LogOut,
  Cpu,
  Globe,
  Wifi,
  ChevronRight,
  Loader2,
  Check,
  AlertCircle,
  Sparkles,
  Cloud,
  HardDrive,
  Bug,
  MessageSquare,
  Download,
  WifiOff,
  Bell,
  BellOff,
  Moon,
  Sun,
  Palette
} from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from '../components/ui/switch';

export const Settings = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [serverInfo, setServerInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // LLM Settings
  const [llmSettings, setLlmSettings] = useState({
    provider: 'openai',
    ollama_url: 'http://localhost:11434',
    ollama_model: 'llama3',
    embedded_model: 'Phi-3-mini-4k-instruct.Q4_0.gguf'
  });
  const [availableModels, setAvailableModels] = useState([]);
  const [embeddedModels, setEmbeddedModels] = useState([]);
  const [testingLlm, setTestingLlm] = useState(false);
  const [llmTestResult, setLlmTestResult] = useState(null);
  const [savingLlm, setSavingLlm] = useState(false);

  // Notification Settings
  const [notificationSettings, setNotificationSettings] = useState({
    enabled: false,
    meal_reminders: true,
    reminder_time: 30,
    shopping_reminders: true,
    weekly_plan_reminder: true
  });
  const [notificationPermission, setNotificationPermission] = useState('default');
  const [savingNotifications, setSavingNotifications] = useState(false);
  const [subscribing, setSubscribing] = useState(false);

  // Theme Settings
  const [darkMode, setDarkMode] = useState(() => {
    // Check localStorage or system preference
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kitchenry_dark_mode');
      if (saved !== null) return saved === 'true';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    loadData();
    checkNotificationPermission();
  }, []);

  // Apply dark mode to document
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('kitchenry_dark_mode', String(darkMode));
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    toast.success(darkMode ? 'Light mode enabled' : 'Dark mode enabled');
  };

  const checkNotificationPermission = () => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  };

  const loadData = async () => {
    try {
      const [serverRes, llmRes, notifRes] = await Promise.all([
        configApi.getConfig(),
        llmApi.getSettings(),
        notificationApi.getSettings().catch(() => ({ data: {} }))
      ]);
      setServerInfo(serverRes.data);
      setLlmSettings({
        provider: llmRes.data.provider || 'openai',
        ollama_url: llmRes.data.ollama_url || 'http://localhost:11434',
        ollama_model: llmRes.data.ollama_model || 'llama3',
        embedded_model: llmRes.data.embedded_model || 'Phi-3-mini-4k-instruct.Q4_0.gguf'
      });
      if (llmRes.data.embedded_models) {
        setEmbeddedModels(llmRes.data.embedded_models);
      }
      
      // Load notification settings
      if (notifRes.data) {
        setNotificationSettings(prev => ({
          ...prev,
          meal_reminders: notifRes.data.meal_reminders ?? true,
          reminder_time: notifRes.data.reminder_time ?? 30,
          shopping_reminders: notifRes.data.shopping_reminders ?? true,
          weekly_plan_reminder: notifRes.data.weekly_plan_reminder ?? true,
          enabled: notifRes.data.enabled ?? false
        }));
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleChangeServer = () => {
    navigate('/server');
  };

  const handleTestLlm = async () => {
    setTestingLlm(true);
    setLlmTestResult(null);
    
    try {
      const res = await llmApi.testConnection(llmSettings);
      setLlmTestResult(res.data);
      
      if (res.data.success && res.data.available_models) {
        setAvailableModels(res.data.available_models);
      }
      
      if (res.data.success) {
        toast.success(res.data.message);
      } else {
        toast.error(res.data.message);
      }
    } catch (error) {
      setLlmTestResult({ success: false, message: 'Connection test failed' });
      toast.error('Failed to test connection');
    } finally {
      setTestingLlm(false);
    }
  };

  const handleSaveLlm = async () => {
    setSavingLlm(true);
    try {
      await llmApi.updateSettings(llmSettings);
      toast.success('AI settings saved!');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSavingLlm(false);
    }
  };

  // Convert VAPID key from base64 to Uint8Array
  const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const handleEnableNotifications = async () => {
    setSubscribing(true);
    
    try {
      // Check if notifications are supported
      if (!('Notification' in window)) {
        toast.error('Notifications are not supported in this browser');
        return;
      }

      // Request permission
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      
      if (permission !== 'granted') {
        toast.error('Notification permission denied');
        return;
      }

      // Check for service worker and push manager
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        toast.error('Push notifications are not supported');
        return;
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;
      
      // Check if already subscribed
      let subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) {
        // For demo purposes, we'll create a simple subscription
        // In production, you'd need to generate proper VAPID keys
        // and store the public key on the server
        try {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            // This is a placeholder - in production, use your VAPID public key
            applicationServerKey: urlBase64ToUint8Array(
              'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U'
            )
          });
        } catch (subscribeError) {
          // If VAPID key fails, try without it (for development)
          console.warn('VAPID subscription failed, notifications may be limited:', subscribeError);
        }
      }

      // Send subscription to server
      if (subscription) {
        await notificationApi.subscribe(subscription.toJSON());
      }

      // Update settings to mark as enabled
      const newSettings = { ...notificationSettings, enabled: true };
      setNotificationSettings(newSettings);
      await notificationApi.updateSettings(newSettings);
      
      toast.success('Notifications enabled!');
    } catch (error) {
      console.error('Failed to enable notifications:', error);
      toast.error('Failed to enable notifications');
    } finally {
      setSubscribing(false);
    }
  };

  const handleDisableNotifications = async () => {
    setSavingNotifications(true);
    try {
      // Unsubscribe from push
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await subscription.unsubscribe();
        }
      }

      const newSettings = { ...notificationSettings, enabled: false };
      setNotificationSettings(newSettings);
      await notificationApi.updateSettings(newSettings);
      toast.success('Notifications disabled');
    } catch (error) {
      toast.error('Failed to disable notifications');
    } finally {
      setSavingNotifications(false);
    }
  };

  const handleSaveNotificationSettings = async () => {
    setSavingNotifications(true);
    try {
      await notificationApi.updateSettings(notificationSettings);
      toast.success('Notification settings saved!');
    } catch (error) {
      toast.error('Failed to save notification settings');
    } finally {
      setSavingNotifications(false);
    }
  };

  const currentServer = localStorage.getItem('kitchenry_server_url') || process.env.REACT_APP_BACKEND_URL;
  const isLocalServer = currentServer?.includes('localhost') || currentServer?.includes('192.168');

  const ollamaModels = availableModels.length > 0 ? availableModels : [
    'llama3', 'llama3:70b', 'mistral', 'phi3', 'gemma', 'codellama'
  ];

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-8" data-testid="settings-page">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="font-heading text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your app preferences</p>
        </motion.div>

        {/* Account Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl border border-border/60 overflow-hidden"
        >
          <div className="p-4 border-b border-border/60 bg-cream-subtle">
            <h2 className="font-heading font-semibold flex items-center gap-2">
              <User className="w-5 h-5 text-sage" />
              Account
            </h2>
          </div>
          
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{user?.name}</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
              <Button 
                variant="outline" 
                className="rounded-full text-destructive border-destructive/30 hover:bg-destructive hover:text-white"
                onClick={handleLogout}
                data-testid="logout-btn"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </motion.section>

        {/* Appearance Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="bg-white dark:bg-card rounded-2xl border border-border/60 overflow-hidden"
        >
          <div className="p-4 border-b border-border/60 bg-cream-subtle">
            <h2 className="font-heading font-semibold flex items-center gap-2">
              <Palette className="w-5 h-5 text-sage" />
              Appearance
            </h2>
          </div>
          
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {darkMode ? (
                  <Moon className="w-5 h-5 text-sage" />
                ) : (
                  <Sun className="w-5 h-5 text-amber-500" />
                )}
                <div>
                  <p className="font-medium">Dark Mode</p>
                  <p className="text-sm text-muted-foreground">
                    {darkMode ? 'Currently using dark theme' : 'Currently using light theme'}
                  </p>
                </div>
              </div>
              <Switch
                checked={darkMode}
                onCheckedChange={toggleDarkMode}
              />
            </div>
          </div>
        </motion.section>

        {/* AI Settings Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white rounded-2xl border border-border/60 overflow-hidden"
        >
          <div className="p-4 border-b border-border/60 bg-cream-subtle">
            <h2 className="font-heading font-semibold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-sage" />
              AI Settings
            </h2>
          </div>
          
          <div className="p-4 space-y-6">
            {/* Provider Selection */}
            <div>
              <Label className="mb-3 block">AI Provider</Label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => setLlmSettings({ ...llmSettings, provider: 'openai' })}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    llmSettings.provider === 'openai'
                      ? 'border-sage bg-sage-light'
                      : 'border-border/60 hover:border-sage'
                  }`}
                >
                  <div className="flex flex-col items-center text-center gap-2">
                    <Cloud className={`w-6 h-6 ${llmSettings.provider === 'openai' ? 'text-sage' : 'text-muted-foreground'}`} />
                    <div>
                      <p className="font-medium text-sm">OpenAI</p>
                      <p className="text-xs text-muted-foreground">Cloud API</p>
                    </div>
                  </div>
                </button>
                
                <button
                  onClick={() => setLlmSettings({ ...llmSettings, provider: 'ollama' })}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    llmSettings.provider === 'ollama'
                      ? 'border-sage bg-sage-light'
                      : 'border-border/60 hover:border-sage'
                  }`}
                >
                  <div className="flex flex-col items-center text-center gap-2">
                    <HardDrive className={`w-6 h-6 ${llmSettings.provider === 'ollama' ? 'text-sage' : 'text-muted-foreground'}`} />
                    <div>
                      <p className="font-medium text-sm">Ollama</p>
                      <p className="text-xs text-muted-foreground">Local Server</p>
                    </div>
                  </div>
                </button>
                
                <button
                  onClick={() => setLlmSettings({ ...llmSettings, provider: 'embedded' })}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    llmSettings.provider === 'embedded'
                      ? 'border-sage bg-sage-light'
                      : 'border-border/60 hover:border-sage'
                  }`}
                >
                  <div className="flex flex-col items-center text-center gap-2">
                    <WifiOff className={`w-6 h-6 ${llmSettings.provider === 'embedded' ? 'text-sage' : 'text-muted-foreground'}`} />
                    <div>
                      <p className="font-medium text-sm">Embedded</p>
                      <p className="text-xs text-muted-foreground">100% Offline</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Embedded Configuration */}
            {llmSettings.provider === 'embedded' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-4 p-4 bg-cream-subtle rounded-xl"
              >
                <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <WifiOff className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-800">
                    <p className="font-medium">Fully Offline AI</p>
                    <p className="text-xs mt-1">AI runs entirely on your server. No internet required after model download.</p>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="embedded-model" className="mb-2 block">Model</Label>
                  <Select 
                    value={llmSettings.embedded_model} 
                    onValueChange={(value) => setLlmSettings({ ...llmSettings, embedded_model: value })}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Select model" />
                    </SelectTrigger>
                    <SelectContent>
                      {(embeddedModels.length > 0 ? embeddedModels : [
                        { id: 'Phi-3-mini-4k-instruct.Q4_0.gguf', name: 'Phi-3 Mini (Recommended)', size: '2.2GB', ram: '4GB' },
                        { id: 'Llama-3.2-3B-Instruct-Q4_K_M.gguf', name: 'Llama 3.2 3B', size: '2.0GB', ram: '4GB' },
                        { id: 'Mistral-7B-Instruct-v0.3-Q4_K_M.gguf', name: 'Mistral 7B', size: '4.4GB', ram: '8GB' },
                      ]).map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          <div className="flex justify-between items-center w-full">
                            <span>{model.name}</span>
                            <span className="text-xs text-muted-foreground ml-2">({model.ram} RAM)</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Model will be downloaded automatically on first use (~2-5GB)
                  </p>
                </div>

                {/* Test Connection */}
                <div className="pt-2">
                  <Button 
                    variant="outline" 
                    onClick={handleTestLlm}
                    disabled={testingLlm}
                    className="rounded-full"
                  >
                    {testingLlm ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Download className="w-4 h-4 mr-2" />
                    )}
                    Check Model Status
                  </Button>
                  
                  {llmTestResult && (
                    <div className={`mt-3 p-3 rounded-lg flex items-center gap-2 ${
                      llmTestResult.success ? 'bg-sage-light text-sage' : 'bg-red-50 text-red-600'
                    }`}>
                      {llmTestResult.success ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <AlertCircle className="w-4 h-4" />
                      )}
                      <span className="text-sm">{llmTestResult.message}</span>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Ollama Configuration */}
            {llmSettings.provider === 'ollama' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-4 p-4 bg-cream-subtle rounded-xl"
              >
                <div>
                  <Label htmlFor="ollama-url" className="mb-2 block">Ollama Server URL</Label>
                  <Input
                    id="ollama-url"
                    value={llmSettings.ollama_url}
                    onChange={(e) => setLlmSettings({ ...llmSettings, ollama_url: e.target.value })}
                    placeholder="http://localhost:11434"
                    className="rounded-xl"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Default: http://localhost:11434
                  </p>
                </div>

                <div>
                  <Label htmlFor="ollama-model" className="mb-2 block">Model</Label>
                  <Select 
                    value={llmSettings.ollama_model} 
                    onValueChange={(value) => setLlmSettings({ ...llmSettings, ollama_model: value })}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Select model" />
                    </SelectTrigger>
                    <SelectContent>
                      {ollamaModels.map((model) => (
                        <SelectItem key={model} value={model}>{model}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Run `ollama pull {llmSettings.ollama_model}` to download
                  </p>
                </div>

                {/* Test Connection */}
                <div className="pt-2">
                  <Button 
                    variant="outline" 
                    onClick={handleTestLlm}
                    disabled={testingLlm}
                    className="rounded-full"
                  >
                    {testingLlm ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Wifi className="w-4 h-4 mr-2" />
                    )}
                    Test Connection
                  </Button>
                  
                  {llmTestResult && (
                    <div className={`mt-3 p-3 rounded-lg flex items-center gap-2 ${
                      llmTestResult.success ? 'bg-sage-light text-sage' : 'bg-red-50 text-red-600'
                    }`}>
                      {llmTestResult.success ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <AlertCircle className="w-4 h-4" />
                      )}
                      <span className="text-sm">{llmTestResult.message}</span>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* OpenAI Info */}
            {llmSettings.provider === 'openai' && (
              <div className="p-4 bg-cream-subtle rounded-xl">
                <p className="text-sm text-muted-foreground">
                  Using OpenAI GPT-4o for AI features. API calls are made through the server.
                </p>
              </div>
            )}

            {/* Save Button */}
            <Button 
              onClick={handleSaveLlm}
              disabled={savingLlm}
              className="rounded-full bg-sage hover:bg-sage-dark"
            >
              {savingLlm ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              Save AI Settings
            </Button>
          </div>
        </motion.section>

        {/* Notifications Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          className="bg-white rounded-2xl border border-border/60 overflow-hidden"
        >
          <div className="p-4 border-b border-border/60 bg-cream-subtle">
            <h2 className="font-heading font-semibold flex items-center gap-2">
              <Bell className="w-5 h-5 text-sage" />
              Notifications
            </h2>
          </div>
          
          <div className="p-4 space-y-6">
            {/* Enable/Disable Notifications */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {notificationSettings.enabled ? (
                  <Bell className="w-5 h-5 text-sage" />
                ) : (
                  <BellOff className="w-5 h-5 text-muted-foreground" />
                )}
                <div>
                  <p className="font-medium">Push Notifications</p>
                  <p className="text-sm text-muted-foreground">
                    {notificationPermission === 'denied' 
                      ? 'Blocked in browser settings'
                      : notificationSettings.enabled 
                        ? 'Enabled' 
                        : 'Disabled'}
                  </p>
                </div>
              </div>
              
              {notificationPermission === 'denied' ? (
                <Button variant="outline" disabled className="rounded-full">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Blocked
                </Button>
              ) : notificationSettings.enabled ? (
                <Button 
                  variant="outline" 
                  onClick={handleDisableNotifications}
                  disabled={savingNotifications}
                  className="rounded-full"
                >
                  {savingNotifications ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <BellOff className="w-4 h-4 mr-2" />
                  )}
                  Disable
                </Button>
              ) : (
                <Button 
                  onClick={handleEnableNotifications}
                  disabled={subscribing}
                  className="rounded-full bg-sage hover:bg-sage-dark"
                >
                  {subscribing ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Bell className="w-4 h-4 mr-2" />
                  )}
                  Enable
                </Button>
              )}
            </div>

            {/* Notification Options - only show if enabled */}
            {notificationSettings.enabled && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-4 pt-4 border-t border-border/60"
              >
                {/* Meal Reminders */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Meal Reminders</p>
                    <p className="text-xs text-muted-foreground">
                      Get reminded before planned meals
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.meal_reminders}
                    onCheckedChange={(checked) => 
                      setNotificationSettings({ ...notificationSettings, meal_reminders: checked })
                    }
                  />
                </div>

                {/* Reminder Time */}
                {notificationSettings.meal_reminders && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="ml-4 p-3 bg-cream-subtle rounded-xl"
                  >
                    <Label htmlFor="reminder-time" className="mb-2 block text-sm">
                      Remind me before meals
                    </Label>
                    <Select 
                      value={String(notificationSettings.reminder_time)} 
                      onValueChange={(value) => 
                        setNotificationSettings({ ...notificationSettings, reminder_time: parseInt(value) })
                      }
                    >
                      <SelectTrigger className="rounded-xl w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 minutes</SelectItem>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="60">1 hour</SelectItem>
                        <SelectItem value="120">2 hours</SelectItem>
                      </SelectContent>
                    </Select>
                  </motion.div>
                )}

                {/* Shopping Reminders */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Shopping List Reminders</p>
                    <p className="text-xs text-muted-foreground">
                      Remind when items are added to shopping list
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.shopping_reminders}
                    onCheckedChange={(checked) => 
                      setNotificationSettings({ ...notificationSettings, shopping_reminders: checked })
                    }
                  />
                </div>

                {/* Weekly Plan Reminder */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Weekly Planning Reminder</p>
                    <p className="text-xs text-muted-foreground">
                      Remind to plan meals for the week
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.weekly_plan_reminder}
                    onCheckedChange={(checked) => 
                      setNotificationSettings({ ...notificationSettings, weekly_plan_reminder: checked })
                    }
                  />
                </div>

                {/* Save Button */}
                <Button 
                  onClick={handleSaveNotificationSettings}
                  disabled={savingNotifications}
                  className="rounded-full bg-sage hover:bg-sage-dark mt-4"
                >
                  {savingNotifications ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Check className="w-4 h-4 mr-2" />
                  )}
                  Save Notification Settings
                </Button>
              </motion.div>
            )}

            {/* Help text when disabled */}
            {!notificationSettings.enabled && notificationPermission !== 'denied' && (
              <p className="text-sm text-muted-foreground">
                Enable notifications to get meal reminders, shopping alerts, and weekly planning prompts.
              </p>
            )}

            {/* Help text when blocked */}
            {notificationPermission === 'denied' && (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                <p className="text-sm text-amber-800">
                  Notifications are blocked in your browser. To enable them, click the lock icon 
                  in your browser's address bar and allow notifications for this site.
                </p>
              </div>
            )}
          </div>
        </motion.section>

        {/* Server Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl border border-border/60 overflow-hidden"
        >
          <div className="p-4 border-b border-border/60 bg-cream-subtle">
            <h2 className="font-heading font-semibold flex items-center gap-2">
              <Server className="w-5 h-5 text-sage" />
              Server Connection
            </h2>
          </div>
          
          <div className="divide-y divide-border/60">
            {/* Current Server */}
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isLocalServer ? (
                    <Wifi className="w-5 h-5 text-sage" />
                  ) : (
                    <Globe className="w-5 h-5 text-sage" />
                  )}
                  <div>
                    <p className="font-medium text-sm">
                      {isLocalServer ? 'Local Server' : 'Cloud Server'}
                    </p>
                    <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                      {currentServer}
                    </p>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={handleChangeServer}
                  className="rounded-full"
                  data-testid="change-server-btn"
                >
                  Change
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Feedback & Support Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-white rounded-2xl border border-border/60 overflow-hidden"
        >
          <div className="p-4 border-b border-border/60 bg-cream-subtle">
            <h2 className="font-heading font-semibold flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-sage" />
              Feedback & Support
            </h2>
          </div>
          
          <div className="divide-y divide-border/60">
            <a 
              href="https://github.com/Domocn/Recipe-App/issues/new?template=bug_report.md&labels=bug"
              target="_blank"
              rel="noopener noreferrer"
              className="p-4 flex items-center justify-between hover:bg-cream-subtle transition-colors block"
            >
              <div className="flex items-center gap-3">
                <Bug className="w-5 h-5 text-terracotta" />
                <div>
                  <p className="font-medium text-sm">Report a Bug</p>
                  <p className="text-xs text-muted-foreground">Found something broken? Let us know on GitHub</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </a>
            
            <a 
              href="https://github.com/Domocn/Recipe-App/issues/new?template=feature_request.md&labels=enhancement"
              target="_blank"
              rel="noopener noreferrer"
              className="p-4 flex items-center justify-between hover:bg-cream-subtle transition-colors block"
            >
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <div>
                  <p className="font-medium text-sm">Request a Feature</p>
                  <p className="text-xs text-muted-foreground">Have an idea? We'd love to hear it</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </a>
            
            <a 
              href="https://github.com/Domocn/Recipe-App/discussions"
              target="_blank"
              rel="noopener noreferrer"
              className="p-4 flex items-center justify-between hover:bg-cream-subtle transition-colors block"
            >
              <div className="flex items-center gap-3">
                <MessageSquare className="w-5 h-5 text-sage" />
                <div>
                  <p className="font-medium text-sm">Community Discussions</p>
                  <p className="text-xs text-muted-foreground">Ask questions and share tips</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </a>
          </div>
        </motion.section>

        {/* App Info */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-center text-sm text-muted-foreground"
        >
          <p>Kitchenry v{serverInfo?.version || '1.0.0'}</p>
          <p className="mt-1">Self-hostable recipe app for families</p>
        </motion.section>
      </div>
    </Layout>
  );
};
