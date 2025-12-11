import { useEffect, useState } from 'react';

export function useAutoTheme() {
  const [theme, setTheme] = useState(() => {
    // Check localStorage for saved preference
    const saved = localStorage.getItem('theme');
    if (saved) return saved;

    // Check system preference
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }

    // Default to light
    return 'light';
  });

  const [isManual, setIsManual] = useState(() => {
    return localStorage.getItem('theme-manual') === 'true';
  });

  // Auto theme based on time of day
  useEffect(() => {
    if (isManual) return; // Don't auto-update if user set manual theme

    const isDayTime = () => {
      const hour = new Date().getHours();
      return hour >= 6 && hour < 18;
    };

    const updateTheme = () => {
      const newTheme = isDayTime() ? 'light' : 'dark';
      setTheme(newTheme);
      document.documentElement.classList.toggle('dark', newTheme === 'dark');
    };

    updateTheme();
    const interval = setInterval(updateTheme, 30 * 60 * 1000); // Every 30 minutes

    return () => clearInterval(interval);
  }, [isManual]);

  // Apply theme to document
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    if (isManual) {
      localStorage.setItem('theme', theme);
    }
  }, [theme, isManual]);

  const toggleManualTheme = () => {
    setIsManual(true);
    localStorage.setItem('theme-manual', 'true');
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const enableAutoTheme = () => {
    setIsManual(false);
    localStorage.setItem('theme-manual', 'false');
    localStorage.removeItem('theme');

    // Immediately apply auto theme
    const hour = new Date().getHours();
    const autoTheme = (hour >= 6 && hour < 18) ? 'light' : 'dark';
    setTheme(autoTheme);
  };

  return {
    theme,
    isManual,
    toggleManualTheme,
    enableAutoTheme,
  };
}
