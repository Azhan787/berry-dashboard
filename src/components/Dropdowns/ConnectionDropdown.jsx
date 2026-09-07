import React, { useState, useRef } from 'react';
import { Activity, CheckCircle2 } from 'lucide-react';
import { useClickOutside } from '../../hooks/useClickOutside';
import './Dropdown.css';

const ConnectionDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useClickOutside(dropdownRef, () => setIsOpen(false));

  return (
    <div className="dropdown-wrapper" ref={dropdownRef} style={{ position: 'relative' }}>
      <button 
        className="icon-btn" 
        onClick={() => setIsOpen(!isOpen)}
        aria-label="System status"
        aria-expanded={isOpen}
      >
        <div className="btn-inner">
          <Activity size={18} />
        </div>
      </button>

      {isOpen && (
        <div className="dropdown-menu" style={{ top: '100%', right: 0, marginTop: '12px', width: '220px' }}>
          <div className="dropdown-header">System Status</div>
          <div style={{ padding: '16px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <CheckCircle2 size={24} color="var(--color-success)" style={{ flexShrink: 0 }} />
            <div>
              <h4 style={{ fontSize: '14px', color: 'var(--text-primary)', marginBottom: '4px' }}>Connected</h4>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>All services are operational</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConnectionDropdown;
