// frontend/src/App.js
import React, { useState, useEffect } from 'react'; // Added useState, useEffect for global theme
import { Routes, Route } from 'react-router-dom';
import SpaceListPage from './pages/SpaceListPage';
import SpaceDetailPage from './pages/SpaceDetailPage';
import Header from './components/Header'; // Import Header here to pass theme handlers
import Drawer from './components/Drawer';   // For global help/feedback drawers if needed
import PluginMarketModal from './components/PluginMarketModal'; // For global Plugin Market
import './App.css';

function App() {
  // Global state that might be controlled at App level
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'system');
  const [showHelpDrawer, setShowHelpDrawer] = useState(false);
  const [showFeedbackDrawer, setShowFeedbackDrawer] = useState(false);
  const [showPluginMarket, setShowPluginMarket] = useState(false);

  useEffect(() => {
    if (theme === 'system') {
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', systemPrefersDark ? 'dark' : 'light');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const handleToggleTheme = (selectedTheme) => {
    setTheme(selectedTheme);
  };

  return (
    <div className="App">
      {/* Render Header globally, passing down necessary props and handlers */}
      <Header
        onToggleTheme={handleToggleTheme}
        onShowHelp={() => setShowHelpDrawer(true)}
        onShowFeedback={() => setShowFeedbackDrawer(true)}
        onShowPluginMarket={() => setShowPluginMarket(true)}
        // pageType, spaceName, spaceType will be determined by individual pages or context
      />
      <Routes>
        <Route path="/" element={<SpaceListPage />} /> {/* SpaceListPage will use its own Header instance or receive props */}
        <Route path="/space/:spaceId" element={<SpaceDetailPage />} />
      </Routes>

      {/* Global Drawers and Modals controlled by App state */}
      <Drawer isOpen={showHelpDrawer} onClose={() => setShowHelpDrawer(false)} title="帮助中心" position="right">
        <div className="drawer-content-placeholder">
            <h2>如何使用本平台</h2> <p>这是一个 DevOps 助手平台...</p> {/* Placeholder */}
        </div>
      </Drawer>
      <Drawer isOpen={showFeedbackDrawer} onClose={() => setShowFeedbackDrawer(false)} title="提交反馈" position="right">
         <div className="drawer-content-placeholder">
            <h2>我们重视您的意见！</h2> {/* Placeholder */}
            <p>请在此处提交您的反馈...</p>
        </div>
      </Drawer>
      <PluginMarketModal isOpen={showPluginMarket} onClose={() => setShowPluginMarket(false)} />
    </div>
  );
}

export default App;
