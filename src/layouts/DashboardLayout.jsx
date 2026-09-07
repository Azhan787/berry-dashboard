import React, { useState, useContext, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import SettingsButton from '../components/SettingsButton';
import SettingsPanel from '../components/SettingsPanel';
import { SettingsContext } from '../contexts/SettingsContext';

const DashboardLayout = () => {
  const { settings } = useContext(SettingsContext);
  const [isSidebarOpen, setIsSidebarOpen] = useState(
    () => window.innerWidth > 1024 && settings.sidebarState === 'expanded',
  );

  // Sync sidebar state from settings panel
  useEffect(() => {
    if (window.innerWidth > 1024) {
      setIsSidebarOpen(settings.sidebarState === 'expanded');
    }
  }, [settings.sidebarState]);

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  return (
    <div className={`app-container ${settings.layout}`}>
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      <main className={`main-content ${!isSidebarOpen ? 'collapsed' : ''}`}>
        <Header toggleSidebar={toggleSidebar} />
        <div className="page-content">
          <Outlet />
        </div>
      </main>
      <SettingsButton />
      <SettingsPanel />
    </div>
  );
};

export default DashboardLayout;
