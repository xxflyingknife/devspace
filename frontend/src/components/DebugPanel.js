// frontend/src/components/DebugPanel.js
import React, { useState, useEffect } from 'react';
import Drawer from './Drawer';
// import LoadingSpinner from './LoadingSpinner'; // If needed for any async ops in debug
import './DebugPanel.css'; // Create this CSS file
import Modal from './Modal';

// Assume some mock status for the dev environment
const mockFetchDevEnvStatus = async (spaceId) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const statuses = ['healthy', 'warning', 'error'];
    return statuses[Math.floor(Math.random() * statuses.length)];
};

const getDrawerContentForDebugType = (debugType) => { /* ... same as before ... */ };


function DebugPanel({ spaceId }) {
  const [activeDebugDrawer, setActiveDebugDrawer] = useState(null);
  const [showDevEnvControlModal, setShowDevEnvControlModal] = useState(false); // Keep if modal is complex
  const [devEnvStatus, setDevEnvStatus] = useState('unknown');

  useEffect(() => {
    mockFetchDevEnvStatus(spaceId).then(status => setDevEnvStatus(status));
  }, [spaceId]);

  const openDebugDrawer = (drawerType) => setActiveDebugDrawer(drawerType);
  const closeDebugDrawer = () => setActiveDebugDrawer(null);
  
  const handleDevEnvAction = (action) => { // Keep this handler
    alert(`Dev Environment Action: ${action} for space ${spaceId} (mocked).`);
    setShowDevEnvControlModal(false);
  };

  const getStatusIndicatorClass = () => { /* ... same as before ... */ };


  return (
    <div className="debug-panel-content"> {/* Renamed container class */}
      <div className="panel-header">
        <span className="panel-title">Debug</span>
        <div className="panel-header-actions">
          <span 
            className={`dev-env-status-indicator ${getStatusIndicatorClass()}`} 
            title={`Dev Environment Status: ${devEnvStatus.charAt(0).toUpperCase() + devEnvStatus.slice(1)}`}
          >●</span>
          <button 
            className="panel-header-button" 
            onClick={() => setShowDevEnvControlModal(true)} // This modal is defined below
            title="Development Environment Controls"
          >▶️</button>
        </div>
      </div>
      <div className="debug-tools-grid"> {/* This part scrolls */}
        <button className="debug-tool-button" onClick={() => openDebugDrawer('frontendLogs')}><span className="debug-tool-icon">📄F</span> Frontend Logs</button>
        <button className="debug-tool-button" onClick={() => openDebugDrawer('backendLogs')}><span className="debug-tool-icon">📄B</span> Backend Logs</button>
        <button className="debug-tool-button" onClick={() => openDebugDrawer('variableInspector')}><span className="debug-tool-icon">{"{x}"}</span> Vars</button> {/* Shorter label */}
        <button className="debug-tool-button" onClick={() => openDebugDrawer('dbViewer')}><span className="debug-tool-icon">🛢️</span> DB</button> {/* Shorter label */}
        <button className="debug-tool-button" onClick={() => openDebugDrawer('cacheViewer')}><span className="debug-tool-icon">⚡</span> Cache</button> {/* Shorter label */}
        <button className="debug-tool-button add-more-tools-button" onClick={() => alert('Add more debug tools (Not Implemented).')}><span className="debug-tool-icon">➕</span> More</button>
      </div>

      {/* Modal for Dev Environment Controls (kept within DebugPanel for now) */}
      {showDevEnvControlModal && (
        <Modal
          isOpen={showDevEnvControlModal}
          onClose={() => setShowDevEnvControlModal(false)}
          title="Development Environment Controls"
        >
          <div className="dev-env-controls-modal-content">
            <p>Actions for your development environment associated with space '{spaceId}'.</p>
            <div className="dev-env-action-buttons">
              <button className="modal-button action primary" onClick={() => handleDevEnvAction('deploy')}>🚀 Deploy/Build</button>
              <button className="modal-button action" onClick={() => handleDevEnvAction('reset')}>🔄 Reset</button>
              <button className="modal-button action success" onClick={() => handleDevEnvAction('start')}>▶️ Start</button>
              <button className="modal-button action danger" onClick={() => handleDevEnvAction('stop')}>⏹️ Stop</button>
            </div>
          </div>
           <div className="modal-footer">
                <button type="button" className="modal-button secondary" onClick={() => setShowDevEnvControlModal(false)}>Close</button>
           </div>
        </Modal>
      )}

      <Drawer
        isOpen={!!activeDebugDrawer}
        onClose={closeDebugDrawer}
        title={activeDebugDrawer ? `Debug: ${activeDebugDrawer.replace(/([A-Z](?=[a-z]))/g, ' $1').trim().replace(/^./, str => str.toUpperCase())}` : "Debug"}
        position="right"
      >
        {activeDebugDrawer && getDrawerContentForDebugType(activeDebugDrawer)}
      </Drawer>
    </div>
  );
}
export default DebugPanel;

