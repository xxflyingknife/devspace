// frontend/src/components/DevRightPanel.js
import React,{useState} from 'react';

import DeploymentsPanel from './DeploymentsPanel'; // Import new component
import DebugPanel from './DebugPanel';           // Import new component
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels"; // <--- IMPORT
import './DevRightPanel.css';                 // Styles for the split layout



function DevRightPanel({ spaceId }) {
  // This component now only acts as a layout container for the two new panels.
  // All specific logic and state for Deployments and Debug are in their respective components.
  const [topPanelSize, setTopPanelSize] = useState(40); // Initial 40% for Deployments
  const [bottomPanelSize, setBottomPanelSize] = useState(60); // Initial 60% for Debug

  return (
    <div className="dev-right-panel-container"> {/* This needs to be height: 100% */}
      <PanelGroup direction="vertical" onLayout={(sizes) => { setTopPanelSize(sizes[0]); setBottomPanelSize(sizes[1]); }}>
        <Panel defaultSize={topPanelSize} collapsible={false} order={1} minSize={25}> {/* Deployments Panel */}
          <div className="panel-content-wrapper"> {/* New wrapper */}
            <DeploymentsPanel spaceId={spaceId} />
          </div>
        </Panel>
        <PanelResizeHandle className="panel-resize-handle vertical-handle" />
        <Panel defaultSize={bottomPanelSize} collapsible={false} order={2} minSize={25}> {/* Debug Panel */}
           <div className="panel-content-wrapper"> {/* New wrapper */}
            <DebugPanel spaceId={spaceId} />
          </div>
        </Panel>
      </PanelGroup>
    </div>
  );
}


export default DevRightPanel;


