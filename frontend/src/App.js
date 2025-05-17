// frontend/src/App.js
import React, { useState, useEffect, useCallback } from 'react'; // Added useCallback
import { Routes, Route, useLocation } from 'react-router-dom';
import Header from './components/Header';
import Drawer from './components/Drawer';
import PluginMarketModal from './components/PluginMarketModal';
import SpaceListPage from './pages/SpaceListPage';
import SpaceDetailPage from './pages/SpaceDetailPage';
import SpaceSettingsModal from './components/SpaceSettingsModal';
import './App.css';

// Assuming API_BASE_URL is used by SpaceListPage for fetching allUserSpaces for PluginMarketModal
// const API_BASE_URL = 'http://localhost:5001/api';

function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'system');
  const [showHelpDrawer, setShowHelpDrawer] = useState(false);
  const [showFeedbackDrawer, setShowFeedbackDrawer] = useState(false);
  const [showPluginMarket, setShowPluginMarket] = useState(false);
  const [showSpaceSettingsModal, setShowSpaceSettingsModal] = useState(false);

  // State for header content that can be updated by pages
  const [currentHeaderProps, setCurrentHeaderProps] = useState({
    spaceId: null,
    spaceName: null,
    spaceType: null,
  });
  
  // State for all user spaces, potentially for PluginMarketModal "select space" feature
  const [allUserSpacesList, _setAllUserSpacesList] = useState([]); // set if needed for API call

  const location = useLocation();

  // Callback for SpaceDetailPage to update header info
  const updateCurrentHeaderProps = useCallback((headerData) => {
    console.log("App.js: updateCurrentHeaderProps called with:", headerData);
    setCurrentHeaderProps(prev => ({ ...prev, ...headerData }));
  }, []); // Empty dependency array as setCurrentHeaderProps is stable

  // Effect to clear space-specific header props when not on a space detail page
  // and to set spaceId when on a detail page for modals.
  useEffect(() => {
    const pathParts = location.pathname.split('/');
    if (pathParts.length >= 3 && pathParts[1] === 'space' && pathParts[2]) {
      // On a space detail page, SpaceDetailPage will provide name and type via callback.
      // We only set spaceId here for modals that might need it before SpaceDetailPage mounts.
      if (currentHeaderProps.spaceId !== pathParts[2]) { // Only update if different
        console.log("App.js useEffect: Setting spaceId for Header/Modals:", pathParts[2]);
        setCurrentHeaderProps(prev => ({ ...prev, spaceId: pathParts[2], spaceName: null, spaceType: null })); // Reset name/type until DetailPage updates
      }
    } else {
      // Not on a space detail page, clear all space-specific info
      if (currentHeaderProps.spaceId !== null || currentHeaderProps.spaceName !== null || currentHeaderProps.spaceType !== null) {
        console.log("App.js useEffect: Clearing space-specific header props.");
        setCurrentHeaderProps({ spaceId: null, spaceName: null, spaceType: null });
      }
    }
  }, [location.pathname]); // Removed currentHeaderProps from deps to avoid loop


  // Example: Fetch allUserSpaces if plugin market needs it (simplified)
  useEffect(() => {
    if (showPluginMarket && allUserSpacesList.length === 0) {
      // mockFetchAllSpaces().then(setAllUserSpacesList); // Assuming a function exists
      console.log("App.js: Would fetch all spaces for Plugin Market now (mock).");
    }
  }, [showPluginMarket, allUserSpacesList.length]);


  const handleToggleTheme = (selectedTheme) => setTheme(selectedTheme);

  return (
    <div className="App">
      <Header
        onToggleTheme={handleToggleTheme}
        onShowHelp={() => setShowHelpDrawer(true)}
        onShowFeedback={() => setShowFeedbackDrawer(true)}
        onShowPluginMarket={() => setShowPluginMarket(true)}
        // Pass dynamic header props from App.js state
        spaceId={currentHeaderProps.spaceId}
        spaceName={currentHeaderProps.spaceName}
        spaceType={currentHeaderProps.spaceType}
        // Pass handler to open SpaceSettingsModal only if on a detail page
        onShowSpaceSettings={currentHeaderProps.spaceId ? () => setShowSpaceSettingsModal(true) : null}
      />
      <Routes>
        <Route path="/" element={<SpaceListPage />} />
        <Route
          path="/space/:spaceIdFromRoute" // Use a different name to avoid confusion with App's spaceId state
          element={
            <SpaceDetailPage
              onSetHeaderProps={updateCurrentHeaderProps}
            />
          }
        />
      </Routes>

      {/* Global Drawers and Modals */}
      <Drawer isOpen={showHelpDrawer} onClose={() => setShowHelpDrawer(false)} title="帮助中心" position="right">
        <div className="drawer-content-placeholder"><h2>如何使用本平台</h2><p>...</p></div>
      </Drawer>
      <Drawer isOpen={showFeedbackDrawer} onClose={() => setShowFeedbackDrawer(false)} title="提交反馈" position="right">
         <div className="drawer-content-placeholder"><h2>我们重视您的意见！</h2><p>...</p></div>
      </Drawer>
      <PluginMarketModal 
        isOpen={showPluginMarket} 
        onClose={() => setShowPluginMarket(false)} 
        currentSpaceId={currentHeaderProps.spaceId} // Pass current spaceId context
        allUserSpaces={allUserSpacesList}
      />
      
      {/* Space Settings Modal rendered by App.js, controlled by its state */}
      {currentHeaderProps.spaceId && ( // Only render if there's a current space context
        <SpaceSettingsModal
          isOpen={showSpaceSettingsModal}
          onClose={() => setShowSpaceSettingsModal(false)}
          spaceId={currentHeaderProps.spaceId} // Use spaceId from App's state
          spaceType={currentHeaderProps.spaceType} // Use spaceType from App's state
        />
      )}
    </div>
  );
}

export default App;


