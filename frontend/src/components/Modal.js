import React, { useEffect } from 'react';
import './Modal.css'; // Create this CSS

function Modal({ isOpen, onClose, title, children, footerContent }) {
  useEffect(() => {
    const handleEsc = (event) => {
      if (event.keyCode === 27) { // ESC key
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEsc, false);
    }
    return () => {
      document.removeEventListener('keydown', handleEsc, false);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          <button className="modal-close-button" onClick={onClose} aria-label="Close modal">
            × {/* Close icon */}
          </button>
        </div>
        <div className="modal-body">
          {children}
        </div>
        {footerContent && (
          <div className="modal-footer">
            {footerContent}
          </div>
        )}
      </div>
    </div>
  );
}

export default Modal;
