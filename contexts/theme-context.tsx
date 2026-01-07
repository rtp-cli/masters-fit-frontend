import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_KEY = '@theme_preference';

type ThemeMode = 'light' | 'dark' | 'auto';

interface ThemeContextType {
  mode: ThemeMode;
  isDark: boolean;
  toggleTheme: () => void;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>('light'); // Default to light for now

  // Load saved preference on mount
  useEffect(() => {
    loadThemePreference();
  }, []);

  // Calculate current theme based on mode and system preference
  const isDark = mode === 'auto'
    ? systemColorScheme === 'dark'
    : mode === 'dark';

  // TODO: Apply dark mode to NativeWind when we implement dark mode toggle
  // For now, we're just tracking state without applying it

  const loadThemePreference = async () => {
    try {
      const saved = await AsyncStorage.getItem(THEME_KEY);
      if (saved && ['light', 'dark', 'auto'].includes(saved)) {
        setMode(saved as ThemeMode);
      }
    } catch (error) {
      console.error('Failed to load theme preference:', error);
    }
  };

  const setThemeMode = async (newMode: ThemeMode) => {
    setMode(newMode);
    try {
      await AsyncStorage.setItem(THEME_KEY, newMode);
    } catch (error) {
      console.error('Failed to save theme preference:', error);
    }
  };

  const toggleTheme = () => {
    // Cycle through: light → dark → auto → light
    const nextMode = mode === 'light' ? 'dark' : mode === 'dark' ? 'auto' : 'light';
    setThemeMode(nextMode);
  };

  return (
    <ThemeContext.Provider value={{ mode, isDark, toggleTheme, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
