import React, { useState, useRef } from 'react';
import { User, Settings, LogOut } from 'lucide-react';
import { useClickOutside } from '../../hooks/useClickOutside';
import './Dropdown.css';
import { useAuth } from '../../contexts/AuthContextValue';
import { useNavigate } from 'react-router-dom';

const ProfileDropdown = ({ toggleSettings }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  useClickOutside(dropdownRef, () => setIsOpen(false));

  return (
    <div className="dropdown-wrapper" ref={dropdownRef} style={{ position: 'relative' }}>
      <div 
        className="user-profile" 
        onClick={() => setIsOpen(!isOpen)}
        style={{ cursor: 'pointer' }}
        aria-label="User profile"
        aria-expanded={isOpen}
      >
        <div className="avatar">
          <User size={18} color="#000" />
        </div>
        <button 
          className="settings-btn" 
          onClick={(e) => {
            e.stopPropagation();
            toggleSettings();
          }}
          aria-label="Open settings"
        >
          <Settings size={18} color="#2196f3" />
        </button>
      </div>

      {isOpen && (
        <div className="dropdown-menu" style={{ top: '100%', right: 0, marginTop: '12px', width: '200px' }}>
          <div className="dropdown-header">
            <h4 style={{ color: 'var(--text-primary)', fontSize: '14px' }}>{user?.user_metadata?.full_name || user?.email || 'Account'}</h4>
            <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Workspace member</p>
          </div>
          <ul className="dropdown-list">
            <li>
              <button className="dropdown-item" onClick={() => { setIsOpen(false); toggleSettings(); }}>
                <Settings size={16} className="item-icon" />
                <span>Appearance Settings</span>
              </button>
            </li>
            <li><button className="dropdown-item" onClick={() => { setIsOpen(false); navigate('/profile'); }}><User size={16} className="item-icon" /><span>My Profile</span></button></li>
            <li><button className="dropdown-item" onClick={() => { setIsOpen(false); navigate('/organization-settings'); }}><Settings size={16} className="item-icon" /><span>Organization Settings</span></button></li>
            <div style={{ height: '1px', backgroundColor: 'var(--border-color)', margin: '4px 0' }}></div>
            <li>
              <button className="dropdown-item" style={{ color: 'var(--color-error)' }} onClick={() => { logout(); navigate('/login', { replace: true }); }}>
                <LogOut size={16} className="item-icon" style={{ color: 'var(--color-error)' }} />
                <span>Logout</span>
              </button>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default ProfileDropdown;
