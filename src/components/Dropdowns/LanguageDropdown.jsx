import React, { useState, useRef } from 'react';
import { useClickOutside } from '../../hooks/useClickOutside';
import './Dropdown.css';

const LanguageDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLang, setSelectedLang] = useState('English');
  const dropdownRef = useRef(null);

  useClickOutside(dropdownRef, () => setIsOpen(false));

  const languages = [
    { code: 'en', name: 'English', icon: 'A' },
    { code: 'ur', name: 'Urdu', icon: 'اردو' },
    { code: 'ar', name: 'Arabic', icon: 'ع' },
  ];

  return (
    <div className="dropdown-wrapper" ref={dropdownRef} style={{ position: 'relative' }}>
      <button 
        className="icon-btn" 
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Select language"
        aria-expanded={isOpen}
      >
        <div className="btn-inner">
          <span className="lang-icon">
            {languages.find(l => l.name === selectedLang)?.icon} / A
          </span>
        </div>
      </button>

      {isOpen && (
        <div className="dropdown-menu" style={{ top: '100%', right: 0, marginTop: '12px', width: '150px' }}>
          <ul className="dropdown-list">
            {languages.map((lang) => (
              <li key={lang.code}>
                <button
                  className={`dropdown-item ${selectedLang === lang.name ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedLang(lang.name);
                    setIsOpen(false);
                  }}
                >
                  {lang.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default LanguageDropdown;
