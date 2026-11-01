import React, { useState, useEffect, useContext } from 'react';
import { Menu, Maximize, Minimize } from 'lucide-react';
import SearchBar from './SearchBar';
import ConnectionDropdown from './Dropdowns/ConnectionDropdown';
import LanguageDropdown from './Dropdowns/LanguageDropdown';
import NotificationDropdown from './Dropdowns/NotificationDropdown';
import ProfileDropdown from './Dropdowns/ProfileDropdown';
import { SettingsContext } from '../contexts/SettingsContextValue';
import { useAuth } from '../contexts/AuthContextValue';
import './Header.css';

const Header = ({ toggleSidebar }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { toggleSettings } = useContext(SettingsContext);
  const { organizations, activeOrganizationId, chooseOrganization } = useAuth();

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  return (
    <header className="header">
      <div className="header-left">
        <button 
          className="icon-btn header-toggle" 
          onClick={toggleSidebar}
          aria-label="Toggle sidebar"
        >
          <Menu size={20} />
        </button>
        
        <SearchBar />
        {organizations.length > 1 && <select className="workspace-switcher" aria-label="Select workspace" value={activeOrganizationId} onChange={(event) => chooseOrganization(event.target.value)}>
          {organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}
        </select>}
      </div>
      
      <div className="header-right">
        <div className="action-buttons">
          <ConnectionDropdown />
          <LanguageDropdown />
          <NotificationDropdown />
          
          <button 
            className="icon-btn" 
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          >
            <div className="btn-inner">
              {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
            </div>
          </button>
        </div>
        
        <ProfileDropdown toggleSettings={toggleSettings} />
      </div>
    </header>
  );
};

export default Header;
