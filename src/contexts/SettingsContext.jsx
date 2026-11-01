import React, { useState, useEffect } from 'react';
import { SettingsContext } from './SettingsContextValue';

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState({
    themeMode: 'dark', // 'dark' | 'light'
    colorTheme: 'purple', // 'purple' | 'blue' | 'green'
    layout: 'comfortable', // 'compact' | 'comfortable'
    sidebarState: 'expanded', // 'expanded' | 'collapsed'
    animationsEnabled: true,
    showNotifications: true,
    isSettingsOpen: false,
  });

  const updateSetting = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const toggleSettings = () => {
    updateSetting('isSettingsOpen', !settings.isSettingsOpen);
  };

  const resetSettings = () => {
    setSettings({
      themeMode: 'dark',
      colorTheme: 'purple',
      layout: 'comfortable',
      sidebarState: 'expanded',
      animationsEnabled: true,
      showNotifications: true,
      isSettingsOpen: settings.isSettingsOpen,
    });
  };

  // Apply side effects to DOM when settings change
  useEffect(() => {
    const root = document.documentElement;
    
    // Theme Mode
    if (settings.themeMode === 'light') {
      root.style.setProperty('--bg-main', '#f8fafc');
      root.style.setProperty('--bg-sidebar', '#ffffff');
      root.style.setProperty('--bg-card', '#ffffff');
      root.style.setProperty('--bg-card-hover', '#f1f5f9');
      root.style.setProperty('--text-primary', '#0f172a');
      root.style.setProperty('--text-secondary', '#475569');
      root.style.setProperty('--border-color', 'rgba(0, 0, 0, 0.1)');
    } else {
      root.style.setProperty('--bg-main', '#111936');
      root.style.setProperty('--bg-sidebar', '#111936');
      root.style.setProperty('--bg-card', '#1a223f');
      root.style.setProperty('--bg-card-hover', '#1e293b');
      root.style.setProperty('--text-primary', '#ffffff');
      root.style.setProperty('--text-secondary', '#8492c4');
      root.style.setProperty('--border-color', 'rgba(255, 255, 255, 0.05)');
    }

    // Color Theme
    if (settings.colorTheme === 'blue') {
      root.style.setProperty('--color-primary', '#2196f3');
      root.style.setProperty('--color-primary-light', '#42a5f5');
      root.style.setProperty('--color-primary-dark', '#1e88e5');
    } else if (settings.colorTheme === 'green') {
      root.style.setProperty('--color-primary', '#10b981');
      root.style.setProperty('--color-primary-light', '#34d399');
      root.style.setProperty('--color-primary-dark', '#059669');
    } else {
      // default purple
      root.style.setProperty('--color-primary', '#673ab7');
      root.style.setProperty('--color-primary-light', '#5e35b1');
      root.style.setProperty('--color-primary-dark', '#4527a0');
    }

    // Animations
    if (!settings.animationsEnabled) {
      document.body.classList.add('disable-animations');
    } else {
      document.body.classList.remove('disable-animations');
    }

  }, [settings.themeMode, settings.colorTheme, settings.animationsEnabled]);

  return (
    <SettingsContext.Provider value={{ settings, updateSetting, toggleSettings, resetSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};
