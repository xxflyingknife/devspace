import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import DropdownMenu from './DropdownMenu';
import './SpaceListItem.css'; // Create this CSS

function SpaceListItem({ id, name, type, date, sourceCount, icon, onDelete, onEditTitle }) {
  const displayIcon = icon || (type === 'dev' ? '💻' : '🛠️');
  const [menuOpen, setMenuOpen] = useState(false);

  const menuItems = [
    { label: '修改标题', onClick: () => { onEditTitle(id, name); setMenuOpen(false); } },
    { label: '删除空间', onClick: () => { onDelete(id, name); setMenuOpen(false); }, danger: true },
  ];

  const handleMenuToggle = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuOpen(!menuOpen);
  };

  return (
    <li className="space-list-row">
      <Link to={`/space/${id}`} className="space-list-row-link">
        <div className="list-item-icon">{displayIcon}</div>
        <div className="list-item-name">{name}</div>
        <div className="list-item-type">{type === 'dev' ? 'Dev Space' : 'Ops Space'}</div>
        <div className="list-item-date">{date}</div>
      </Link>
      <div className="list-item-actions">
        <button
            className="list-item-menu-button"
            onClick={handleMenuToggle}
            aria-label={`Options for ${name}`}
        >
            ⋮
        </button>
        {menuOpen && <DropdownMenu items={menuItems} onClose={() => setMenuOpen(false)} align="right" />}
      </div>
    </li>
  );
}

export default SpaceListItem;
