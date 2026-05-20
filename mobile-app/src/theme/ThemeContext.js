import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightColors, darkColors } from './colors';

const ThemeContext = createContext({
  theme: 'dark',
  colors: darkColors,
  toggleTheme: () => {},
  isDark: true,
});

export const ThemeProvider = ({ children }) => {
  const systemScheme = useColorScheme();
  const [theme, setTheme] = useState('dark'); // Default dark for premium feel

  useEffect(() => {
    AsyncStorage.getItem('khidmat_theme').then(saved => {
      if (saved === 'dark' || saved === 'light') {
        setTheme(saved);
      } else {
        // Use system preference on first launch
        setTheme(systemScheme === 'light' ? 'light' : 'dark');
      }
    }).catch(() => {
      setTheme('dark');
    });
  }, []);

  const toggleTheme = async () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    try {
      await AsyncStorage.setItem('khidmat_theme', next);
    } catch (e) {
      console.warn('Failed to save theme:', e);
    }
  };

  return (
    <ThemeContext.Provider value={{
      theme,
      colors: theme === 'dark' ? darkColors : lightColors,
      toggleTheme,
      isDark: theme === 'dark',
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
export default ThemeContext;
