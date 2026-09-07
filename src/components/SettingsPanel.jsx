import React, { useContext } from 'react';
import { X, Check } from 'lucide-react';
import { SettingsContext } from '../contexts/SettingsContext';
import './SettingsPanel.css';

const SettingsPanel = () => {
  const { settings, updateSetting, toggleSettings, resetSettings } = useContext(SettingsContext);

  const themeModes = ['dark', 'light'];
  const colorThemes = ['purple', 'blue', 'green'];
  const layouts = ['compact', 'comfortable'];
  const sidebarStates = ['expanded', 'collapsed'];

  return (
    <>
      {settings.isSettingsOpen && (
        <div className="settings-overlay" onClick={toggleSettings}></div>
      )}
      <div className={`settings-drawer ${settings.isSettingsOpen ? 'open' : ''}`}>
        <div className="settings-header">
          <h3>Settings</h3>
          <button className="icon-btn close-btn" onClick={toggleSettings} aria-label="Close settings">
            <X size={20} />
          </button>
        </div>

        <div className="settings-content">
          {/* Appearance */}
          <div className="settings-section">
            <h4 className="settings-subtitle">Appearance</h4>
            <div className="settings-grid">
              {themeModes.map((mode) => (
                <button
                  key={mode}
                  className={`setting-option ${settings.themeMode === mode ? 'active' : ''}`}
                  onClick={() => updateSetting('themeMode', mode)}
                >
                  <span style={{ textTransform: 'capitalize' }}>{mode} Mode</span>
                  {settings.themeMode === mode && <Check size={16} />}
                </button>
              ))}
            </div>
          </div>

          {/* Theme */}
          <div className="settings-section">
            <h4 className="settings-subtitle">Theme Color</h4>
            <div className="settings-grid">
              {colorThemes.map((color) => (
                <button
                  key={color}
                  className={`setting-option ${settings.colorTheme === color ? 'active' : ''}`}
                  onClick={() => updateSetting('colorTheme', color)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div className={`theme-color-dot ${color}`}></div>
                    <span style={{ textTransform: 'capitalize' }}>{color}</span>
                  </div>
                  {settings.colorTheme === color && <Check size={16} />}
                </button>
              ))}
            </div>
          </div>

          {/* Layout */}
          <div className="settings-section">
            <h4 className="settings-subtitle">Layout</h4>
            <div className="settings-grid">
              {layouts.map((layout) => (
                <button
                  key={layout}
                  className={`setting-option ${settings.layout === layout ? 'active' : ''}`}
                  onClick={() => updateSetting('layout', layout)}
                >
                  <span style={{ textTransform: 'capitalize' }}>{layout}</span>
                  {settings.layout === layout && <Check size={16} />}
                </button>
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div className="settings-section">
            <h4 className="settings-subtitle">Sidebar</h4>
            <div className="settings-grid">
              {sidebarStates.map((state) => (
                <button
                  key={state}
                  className={`setting-option ${settings.sidebarState === state ? 'active' : ''}`}
                  onClick={() => updateSetting('sidebarState', state)}
                >
                  <span style={{ textTransform: 'capitalize' }}>{state}</span>
                  {settings.sidebarState === state && <Check size={16} />}
                </button>
              ))}
            </div>
          </div>

          {/* Other */}
          <div className="settings-section">
            <h4 className="settings-subtitle">Other</h4>
            <div className="toggle-row">
              <span>Enable Animations</span>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={settings.animationsEnabled}
                  onChange={(e) => updateSetting('animationsEnabled', e.target.checked)}
                />
                <span className="slider round"></span>
              </label>
            </div>
            <div className="toggle-row">
              <span>Show Notifications</span>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={settings.showNotifications}
                  onChange={(e) => updateSetting('showNotifications', e.target.checked)}
                />
                <span className="slider round"></span>
              </label>
            </div>
          </div>
        </div>

        <div className="settings-footer">
          <button className="reset-btn" onClick={resetSettings}>
            Reset Settings
          </button>
        </div>
      </div>
    </>
  );
};

export default SettingsPanel;
