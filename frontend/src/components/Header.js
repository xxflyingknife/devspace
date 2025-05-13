import React, { useState } from 'react';
import Logo from './Logo';
import DropdownMenu from './DropdownMenu'; // New component
import './Header.css';

function Header({
  pageType = 'list', // 'list' or 'detail'
  spaceType = null, // 'dev' or 'ops' (for detail page)
  spaceName = null, // For detail page
  onToggleTheme, // Function to toggle theme
  onShowHelp,
  onShowFeedback
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);

  const settingsMenuItems = [
    { label: '帮助', onClick: onShowHelp },
    { label: '反馈', onClick: onShowFeedback },
    { type: 'divider' },
    { label: '页面模式',
      alignSubmenu: 'left',
      subMenu: [
        { label: '浅色模式', onClick: () => onToggleTheme('light') },
        { label: '深色模式', onClick: () => onToggleTheme('dark') },
        { label: '跟随系统', onClick: () => onToggleTheme('system') },
      ]
    },
    // Add more settings items if needed
  ];

  const userMenuItems = [
    { label: '个人资料', onClick: () => alert('View Profile clicked') },
    { label: 'API 密钥', onClick: () => alert('API Keys clicked') },
    { type: 'divider' },
    { label: '退出登录', onClick: () => alert('Logout clicked') },
  ];

  return (
    <header className="app-header">
      <div className="header-left">
        <Logo />
        {/* No "NotebookLM Plus" title as per new design */}
        {pageType === 'detail' && spaceName && (
          <h1 className="header-space-name">{spaceName}</h1>
        )}
      </div>
      <div className="header-right">
        {pageType === 'detail' && (
            <>
              {/* Buttons for detail view based on spaceType */}
              {spaceType === 'dev' && (
                <>
                  {/* Placeholder for Dev specific header actions */}
                  {/* <button className="header-button">分析</button> */}
                </>
              )}
              {spaceType === 'ops' && (
                <>
                  {/* Placeholder for Ops specific header actions */}
                </>
              )}
              {/* Common detail view actions */}
              <button className="header-button">分享</button>
            </>
        )}
        <div className="dropdown-container">
            <button
                className="header-icon-button"
                onClick={() => setSettingsOpen(!settingsOpen)}
                aria-label="Settings"
            >
                ⚙️ {/* Placeholder for Settings Icon */}
            </button>
            {settingsOpen && <DropdownMenu items={settingsMenuItems} onClose={() => setSettingsOpen(false)} align="right" />}
        </div>
         <div className="dropdown-container">
            <button
                className="header-icon-button user-avatar-button" /* For styling user avatar */
                onClick={() => setUserOpen(!userOpen)}
                aria-label="User Profile"
            >
                👤 {/* Placeholder for User Avatar */}
            </button>
            {userOpen && <DropdownMenu items={userMenuItems} onClose={() => setUserOpen(false)} align="right"/>}
        </div>
      </div>
    </header>
  );
}

export default Header;
