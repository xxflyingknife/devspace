// frontend/src/components/DropdownMenu.js
import React, { useEffect, useRef } from 'react';
import './DropdownMenu.css';

function DropdownMenu({ items, onClose, align = 'left', isSubmenu = false }) {
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  const renderMenuItem = (item, index) => { // Removed isSubMenuContext for simplicity if not strictly needed by CSS now
    if (item.type === 'divider') {
      return <div key={index} className="dropdown-divider"></div>;
    }
    if (item.subMenu) {
        return (
            <li key={index} className="dropdown-item has-submenu">
                <span>{item.label} ›</span>
                <ul className={`dropdown-submenu ${item.alignSubmenu === 'left' ? "opens-left" : ""}`}> {/* Uses item.alignSubmenu from Header.js */}
                    {item.subMenu.map((subItem, subIndex) => renderMenuItem(subItem, subIndex))}
                </ul>
            </li>
        )
    }
    return (
      <li
        key={index}
        className={`dropdown-item ${item.danger ? 'danger' : ''}`}
        onClick={(event) => { // <-- Event object received here
          if (typeof item.onClick === 'function') {
            item.onClick(event); // <-- Pass event object to the handler defined in SpaceCard.js
          }
          // If you want all menu items to close the dropdown after click:
          // onClose();
        }}
      >
        {item.label}
      </li>
    );
  };

  return (
    <div ref={menuRef} className={`dropdown-menu-container ${align} ${isSubmenu ? 'is-a-submenu-instance' : ''}`}>
      <ul className="dropdown-list">
        {items.map((item, index) => renderMenuItem(item, index))}
      </ul>
    </div>
  );
}

export default DropdownMenu;

