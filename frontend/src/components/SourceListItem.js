import React from 'react';
import './SourceListItem.css'; // We'll create SourceListItem.css

function SourceListItem({ id, name, type = 'file', isSelected, onSelect }) {
  const icon = type === 'folder' ? '📁' : '📄'; // Simple icon logic

  const handleChange = (event) => {
    onSelect(id, event.target.checked);
  };

  return (
    <li className={`source-list-item ${isSelected ? 'selected' : ''}`}>
      <input
        type="checkbox"
        id={`source-${id}`}
        checked={isSelected}
        onChange={handleChange}
        className="source-checkbox"
      />
      <label htmlFor={`source-${id}`} className="source-label">
        <span className="source-icon">{icon}</span>
        <span className="source-name">{name}</span>
      </label>
      <button
          className="source-item-menu"
          onClick={(e) => { e.stopPropagation(); alert('Options for ' + name); }}
      >
          [...] {/* Placeholder */}
      </button>
    </li>
  );
}

export default SourceListItem;
