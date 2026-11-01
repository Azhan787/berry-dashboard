import React, { useContext } from 'react';
import { Settings } from 'lucide-react';
import { SettingsContext } from '../contexts/SettingsContextValue';
import './SettingsButton.css';

const SettingsButton = () => {
  const { toggleSettings } = useContext(SettingsContext);

  return (
    <button className="floating-settings-btn" onClick={toggleSettings} aria-label="Open settings panel">
      <Settings size={24} color="#fff" />
    </button>
  );
};

export default SettingsButton;
