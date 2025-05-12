import React from 'react';
import Logo from './Logo';
import './Header.css'; // We'll create Header.css

// Simple Header component
// Takes props to customize content (e.g., title, buttons)
function Header({ pageTitle = null, spaceName = null, showSettings = true, showUserProfile = true }) {
  return (
    <header className="app-header">
      <div className="header-left">
        <Logo />
        {pageTitle && <h1 className="header-page-title">{pageTitle}</h1>}
        {spaceName && <h1 className="header-space-name">{spaceName}</h1>}
      </div>
      <div className="header-right">
        {/* Placeholders for buttons/icons - Implement with actual icons/buttons */}
        {spaceName && (
            <>
              <button className="header-button">[分析]</button>
              <button className="header-button">[分享]</button>
            </>
        )}
        {showSettings && <button className="header-icon-button">[设置]</button>}
        {showUserProfile && <button className="header-icon-button">[用户头像]</button>}
      </div>
    </header>
  );
}

export default Header;
