import React from 'react';
import { Link } from 'react-router-dom';
import './SpaceCard.css'; // We'll create SpaceCard.css

function SpaceCard({ id, name, date, sourceCount, icon, color = '#e0f7fa' }) {
 // Use a default icon if none provided
 const displayIcon = icon || '📦'; // Default package box icon

 return (
    <Link to={`/space/${id}`} className="space-card-link">
      <div className="space-card" style={{ backgroundColor: color }}>
        <div className="card-content">
          <div className="card-icon">{displayIcon}</div>
          <h3 className="card-title">{name}</h3>
          <p className="card-meta">{date} · {sourceCount}个来源</p>
        </div>
        <button
            className="card-menu-button"
            onClick={(e) => { e.preventDefault(); alert('Menu clicked for ' + name); }}
        >
            [...] {/* Placeholder for 3-dot menu icon */}
        </button>
      </div>
    </Link>
 );
}

export default SpaceCard;
