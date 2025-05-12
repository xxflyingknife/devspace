import React, { useState } from 'react';
import './Accordion.css'; // We'll create Accordion.css

function Accordion({ title, children, initialOpen = false }) {
  const [isOpen, setIsOpen] = useState(initialOpen);

  const toggleOpen = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className={`accordion-section ${isOpen ? 'open' : 'closed'}`}>
      <button className="accordion-header" onClick={toggleOpen} aria-expanded={isOpen}>
        <span className="accordion-title">{title}</span>
        <span className="accordion-icon">{isOpen ? '−' : '+'}</span> {/* Simple +/- icon */}
      </button>
      {isOpen && (
        <div className="accordion-content">
          {children}
        </div>
      )}
    </div>
  );
}

export default Accordion;
