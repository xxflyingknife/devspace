// frontend/src/components/DevRightPanel.js
import React from 'react';
import DeploymentsPanel from './DeploymentsPanel'; // Import new component
import DebugPanel from './DebugPanel';           // Import new component
import './DevRightPanel.css';                 // Styles for the split layout

function DevRightPanel({ spaceId }) {
  // This component now only acts as a layout container for the two new panels.
  // All specific logic and state for Deployments and Debug are in their respective components.

  return (
    <div className="dev-right-panel-container"> {/* This will be flex-direction: column */}
      <div className="dev-right-panel-top-section"> {/* For Deployments */}
        <DeploymentsPanel spaceId={spaceId} />
      </div>
      <div className="dev-right-panel-bottom-section"> {/* For Debug */}
        <DebugPanel spaceId={spaceId} />
      </div>
    </div>
  );
}

export default DevRightPanel;


