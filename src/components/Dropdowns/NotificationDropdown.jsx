import React, { useState, useRef } from 'react';
import { Bell, ShoppingCart, CreditCard, UserPlus, FileBarChart, Check } from 'lucide-react';
import { useClickOutside } from '../../hooks/useClickOutside';
import './Dropdown.css';

const NotificationDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(4);
  const dropdownRef = useRef(null);

  useClickOutside(dropdownRef, () => setIsOpen(false));

  const notifications = [
    { id: 1, title: 'New order received', time: '2 mins ago', icon: ShoppingCart, color: '#42a5f5', bg: 'rgba(66, 165, 245, 0.1)' },
    { id: 2, title: 'Payment completed', time: '1 hour ago', icon: CreditCard, color: '#00c853', bg: 'rgba(0, 200, 83, 0.1)' },
    { id: 3, title: 'New customer registered', time: '3 hours ago', icon: UserPlus, color: '#673ab7', bg: 'rgba(103, 58, 183, 0.1)' },
    { id: 4, title: 'Monthly report generated', time: '1 day ago', icon: FileBarChart, color: '#ffc107', bg: 'rgba(255, 193, 7, 0.1)' },
  ];

  const markAllAsRead = () => {
    setUnreadCount(0);
  };

  return (
    <div className="dropdown-wrapper" ref={dropdownRef} style={{ position: 'relative' }}>
      <button 
        className="icon-btn" 
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
        aria-expanded={isOpen}
      >
        <div className="btn-inner">
          <Bell size={18} />
          {unreadCount > 0 && <span className="notification-dot"></span>}
        </div>
      </button>

      {isOpen && (
        <div className="dropdown-menu" style={{ top: '100%', right: 0, marginTop: '12px', width: '300px' }}>
          <div className="dropdown-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Notifications</span>
            {unreadCount > 0 && (
              <button 
                onClick={markAllAsRead}
                style={{ fontSize: '12px', color: 'var(--color-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Check size={14} /> Mark all read
              </button>
            )}
          </div>
          <div style={{ maxHeight: '300px', overflowY: 'auto', padding: '8px 0' }}>
            {notifications.map((notif) => (
              <div 
                key={notif.id} 
                style={{ 
                  display: 'flex', 
                  gap: '12px', 
                  padding: '12px 16px', 
                  borderBottom: '1px solid var(--border-color)',
                  cursor: 'pointer'
                }}
                className="dropdown-item"
              >
                <div style={{ 
                  width: '36px', height: '36px', borderRadius: '50%', 
                  backgroundColor: notif.bg, color: notif.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <notif.icon size={18} />
                </div>
                <div>
                  <h4 style={{ fontSize: '14px', color: 'var(--text-primary)', marginBottom: '4px' }}>{notif.title}</h4>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{notif.time}</p>
                </div>
              </div>
            ))}
          </div>
          <div style={{ padding: '12px', textAlign: 'center', borderTop: '1px solid var(--border-color)' }}>
            <button style={{ color: 'var(--color-primary-light)', fontSize: '14px', fontWeight: '500' }}>View All</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;
