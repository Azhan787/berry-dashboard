import React, { useState, useRef } from 'react';
import { Activity, CheckCircle2 } from 'lucide-react';
import { useClickOutside } from '../../hooks/useClickOutside';
import './Dropdown.css';

const ConnectionDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState('idle');
  const dropdownRef = useRef(null);

  useClickOutside(dropdownRef, () => setIsOpen(false));

  const toggle = () => {
    const opening = !isOpen;
    setIsOpen(opening);
    if (!opening) return;
    setStatus('checking');
    const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';
    const healthUrl = apiBase.replace(/\/api\/v1\/?$/, '/health');
    fetch(healthUrl).then((response) => { if (!response.ok) throw new Error('API unavailable'); setStatus('online'); }).catch(() => setStatus('unavailable'));
  };

  return (
    <div className="dropdown-wrapper" ref={dropdownRef} style={{ position: 'relative' }}>
      <button 
        className="icon-btn" 
        onClick={toggle}
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
            {status === 'online' ? <CheckCircle2 size={24} color="var(--color-success)" style={{ flexShrink: 0 }} /> : <Activity size={24} color={status === 'unavailable' ? '#f87171' : 'var(--text-muted)'} style={{ flexShrink: 0 }} />}
            <div>
              <h4 style={{ fontSize: '14px', color: 'var(--text-primary)', marginBottom: '4px' }}>{status === 'checking' ? 'Checking…' : status === 'online' ? 'API responding' : status === 'unavailable' ? 'API unavailable' : 'Not checked'}</h4>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{status === 'online' ? 'Express health endpoint responded.' : status === 'unavailable' ? 'The configured API health endpoint could not be reached.' : 'Open this panel to check the Express API.'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConnectionDropdown;
