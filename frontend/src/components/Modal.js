// frontend/src/components/Modal.js
import React, { useEffect } from 'react';
import './Modal.css'; // Ensure this CSS file exists and is correct

function Modal({ isOpen, onClose, title, children, footerContent, modalClassName = "" }) {
  useEffect(() => {
    const handleEsc = (event) => {
      if (event.keyCode === 27) { // ESC key
        if (typeof onClose === 'function') {
          onClose();
        }
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEsc, false);
      // document.body.style.overflow = 'hidden'; // Optional: Disable body scroll
    }

    return () => {
      document.removeEventListener('keydown', handleEsc, false);
      // document.body.style.overflow = 'auto'; // Optional: Re-enable body scroll
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className={`modal-content ${modalClassName}`} 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Conditional rendering for header based on title presence */}
        {title && (
            <div className="modal-header">
            <h3 className="modal-title">{title}</h3>
            <button 
                className="modal-close-button" 
                onClick={() => { // Direct call
                    if (typeof onClose === 'function') {
                        onClose();
                    }
                }} 
                aria-label="Close modal"
            >
                ×
            </button>
            </div>
        )}
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
