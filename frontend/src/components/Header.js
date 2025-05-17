// frontend/src/components/Header.js
import React, { useState } from 'react';
import { useLocation, useParams } from 'react-router-dom'; // To get route info
import Logo from './Logo';
import DropdownMenu from './DropdownMenu';
// PluginMarketModal is now rendered in App.js, Header just triggers it
import './Header.css';

function Header({
  onToggleTheme,
  onShowHelp,
  onShowFeedback,
  onShowPluginMarket, // Prop to open plugin market
  // Props below might be derived from route or passed by parent page if Header is not global
  spaceName, // This would be passed by SpaceDetailPage
  
  // Props passed from SpaceDetailPage when this Header is rendered there
  spaceId,          // Current spaceId if on detail page
  spaceType,        // Current spaceType ('dev' or 'ops') if on detail page
  onShowSpaceSettings, // Callback from SpaceDetailPage to open its SpaceSettingsModal


}) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);

  const location = useLocation();
  const params = useParams();

  // Determine pageType and potentially spaceType based on route
  let pageType = 'list';
  let currentSpaceType = null; // Will be derived if on space detail page

  if (location.pathname.startsWith('/space/')) {
    pageType = 'detail';
    // To get spaceType, SpaceDetailPage would ideally pass it,
    // or we'd fetch space details here based on params.spaceId (more complex for Header)
    // For simplicity, let's assume spaceType is passed if needed by header buttons,
    // or a more advanced context/routing solution provides it.
    // For now, we'll just use spaceName if provided for detail page.
  }

  const isDetailPage = location.pathname.startsWith('/space/');


  const settingsMenuItems = [
    { label: '帮助', onClick: onShowHelp },
    { label: '反馈', onClick: onShowFeedback },
    { type: 'divider' },
    {
      label: '页面模式',
      alignSubmenu: 'left', // For submenu to open left
      subMenu: [
        { label: '浅色模式', onClick: () => onToggleTheme('light') },
        { label: '深色模式', onClick: () => onToggleTheme('dark') },
        { label: '跟随系统', onClick: () => onToggleTheme('system') },
      ]
    },
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
        {isDetailPage && spaceName && (
          <>
            <h1 className="header-space-name">{spaceName}</h1>
            {/* Space Specific Settings Button - only if onShowSpaceSettings is passed */}
            {onShowSpaceSettings && (
                <button
                    className="header-icon-button space-specific-settings-button"
                    onClick={onShowSpaceSettings}
                    title="空间设置"
                >
            <span className={`space-type-logo type-${spaceType}`}>
              {spaceType === 'dev' ? ' Dev ' : (spaceType === 'ops' ? ' Ops ' : '')}
            </span>
                </button>
            )}
          </>
        )}
      </div>




      <div className="header-right">
        {pageType === 'detail' && (
          <>
            {/* Placeholder for context-specific buttons on detail page */}
            {/* e.g., if spaceType === 'dev', show dev actions */}
            <button className="header-button">分享</button>
          </>
        )}
        <button
          className="header-button plugin-market-button"
          onClick={onShowPluginMarket} // Use prop to trigger modal in App.js
          title="插件市场"
        >
          🧩 插件市场
        </button>
        <div className="dropdown-container">
          <button
            className="header-icon-button"
            onClick={() => setSettingsOpen(!settingsOpen)}
            aria-label="Settings"
            title="设置"
          >
            ⚙️
          </button>
          {settingsOpen && <DropdownMenu items={settingsMenuItems} onClose={() => setSettingsOpen(false)} align="right" />}
        </div>
        <div className="dropdown-container">
          <button
            className="header-icon-button user-avatar-button"
            onClick={() => setUserOpen(!userOpen)}
            aria-label="User Profile"
            title="用户账户"
          >
            👤
          </button>
          {userOpen && <DropdownMenu items={userMenuItems} onClose={() => setUserOpen(false)} align="right"/>}
        </div>
      </div>
    </header>
  );
}

export default Header;
