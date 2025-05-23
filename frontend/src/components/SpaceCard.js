import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import DropdownMenu from './DropdownMenu'; // For card actions
import './SpaceCard.css';

function SpaceCard({ id, name, type, date, sourceCount, icon, color = '#e0f7fa', onDelete, onEditTitle }) {
  const displayIcon = icon || (type === 'dev' ? '💻' : '🛠️'); // Default icons based on type
  const [menuOpen, setMenuOpen] = useState(false);

const menuItems = [
  { label: '修改标题', onClick: (e) => { e.preventDefault(); e.stopPropagation(); onEditTitle(id, name); setMenuOpen(false); } },
  { label: '删除空间', onClick: (e) => { e.preventDefault(); e.stopPropagation(); onDelete(id, name); setMenuOpen(false); }, danger: true },
];

  const handleMenuToggle = (e) => {
    e.preventDefault(); // Prevent link navigation
    e.stopPropagation();
    setMenuOpen(!menuOpen);
  };

  return (
    <Link to={`/space/${id}`} className="space-card-link">
      <div className="space-card" style={{ backgroundColor: color }}>
        <div className="card-header">
            <div className="card-icon">{displayIcon}</div>
        </div>
        <div className="card-content">
          <h3 className="card-title">{name}</h3>
          <p className="card-meta">
           {date}  ·  <span className={`card-type-meta-badge type-${type}`}>{type === 'dev' ? 'Dev Space' : 'Ops Space'}</span>
          </p>
        </div>
        <div className="card-menu-container">
            <button
                className="card-menu-button"
                onClick={handleMenuToggle}
                aria-label={`Options for ${name}`}
            >
                ⋮ {/* Actual three dots icon */}
            </button>
            {menuOpen && <DropdownMenu items={menuItems} onClose={() => setMenuOpen(false)} align="right" />}
        </div>
      </div>
    </Link>
  );
}
export default SpaceCard;
