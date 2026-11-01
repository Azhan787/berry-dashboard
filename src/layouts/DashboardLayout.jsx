import React, { useState, useContext } from 'react';
import { Outlet } from 'react-router-dom';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import SettingsButton from '../components/SettingsButton';
import SettingsPanel from '../components/SettingsPanel';
import { SettingsContext } from '../contexts/SettingsContextValue';

const DashboardLayout = () => {
  const { settings, updateSetting } = useContext(SettingsContext);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const isDesktop = window.innerWidth > 1024;
  const isSidebarOpen = isDesktop ? settings.sidebarState === 'expanded' : mobileSidebarOpen;

  const toggleSidebar = () => {
    if (isDesktop) updateSetting('sidebarState', isSidebarOpen ? 'collapsed' : 'expanded');
    else setMobileSidebarOpen((prev) => !prev);
  };
  const closeSidebar = () => {
    if (isDesktop) updateSetting('sidebarState', 'collapsed');
    else setMobileSidebarOpen(false);
  };

  return (
    <div className={`app-container ${settings.layout}`}>
      <Sidebar isOpen={isSidebarOpen} setIsOpen={closeSidebar} />
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
