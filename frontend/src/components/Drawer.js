import React, { useEffect } from 'react';
import './Drawer.css'; // Create this CSS

function Drawer({ isOpen, onClose, title, children, position = 'right' }) {
  useEffect(() => {
    const handleEsc = (event) => {
      if (event.keyCode === 27) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden'; // Prevent background scroll
      document.addEventListener('keydown', handleEsc, false);
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
      document.removeEventListener('keydown', handleEsc, false);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      <div className="drawer-overlay" onClick={onClose}></div>
      <div className={`drawer-container ${position} ${isOpen ? 'open' : ''}`}>
        <div className="drawer-header">
          <h3 className="drawer-title">{title}</h3>
          <button className="drawer-close-button" onClick={onClose} aria-label="Close drawer">
            ×
          </button>
        </div>
        <div className="drawer-body">
          {children}
        </div>
      </div>
    </>
  );
}
export default Drawer;
