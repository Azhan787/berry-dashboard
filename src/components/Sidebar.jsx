import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, TrendingUp, FileText, Users,
  BarChart2, PieChart, Activity, ShoppingBag, Box,
  Headset, Rss
} from 'lucide-react';
import './Sidebar.css';

const navItems = [
  {
    section: 'Dashboard',
    items: [
      { label: 'Default', path: '/', icon: LayoutDashboard, end: true },
      { label: 'Analytics', path: '/analytics', icon: TrendingUp },
      { label: 'Invoice', path: '/invoice', icon: FileText },
      { label: 'CRM', path: '/crm', icon: Headset },
      { label: 'Blog', path: '/blog', icon: Rss },
    ],
  },
  {
    section: 'Widget',
    items: [
      { label: 'Statistics', path: '/statistics', icon: Activity },
      { label: 'Data', path: '/data', icon: BarChart2 },
      { label: 'Chart', path: '/chart', icon: PieChart },
    ],
  },
  {
    section: 'Application',
    items: [
      { label: 'Users', path: '/users', icon: Users },
      { label: 'Customer', path: '/customers', icon: ShoppingBag },
    ],
  },
];

const Sidebar = ({ isOpen, setIsOpen }) => {
  const handleNavClick = () => {
    // Close sidebar on mobile after navigation
    if (window.innerWidth <= 1024) {
      setIsOpen(false);
    }
  };

  return (
    <>
      <div
        className={`sidebar-overlay${isOpen ? ' visible' : ''}`}
        onClick={() => setIsOpen(false)}
        aria-hidden={!isOpen}
      />

      <aside className={`sidebar ${isOpen ? 'open' : 'collapsed'}`}>
        <div className="sidebar-header">
          <div className="logo-container">
            <div className="logo-icon">
              <Box size={20} color="#fff" />
            </div>
            <span className="logo-text">BERRY</span>
          </div>
        </div>

        <div className="sidebar-content">
          {navItems.map(({ section, items }) => (
            <div className="nav-section" key={section}>
              <h3 className="nav-section-title">{section}</h3>
              <ul className="nav-list">
                {items.map(({ label, path, icon: Icon, end }) => (
                  <li className="nav-item" key={path}>
                    <NavLink
                      to={path}
                      end={end}
                      className={({ isActive }) =>
                        `nav-link${isActive ? ' active' : ''}`
                      }
                      onClick={handleNavClick}
                    >
                      <Icon size={20} />
                      <span>{label}</span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
