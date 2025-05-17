// frontend/src/components/TaskArea.js
import React, { useState } from 'react';
import AppBlueprintView from './AppBlueprintView';
import AppBuildView from './AppBuildView';
import './TaskArea.css';

function TaskArea({ spaceId, currentAppBlueprintVersion, onAppBlueprintVersionChange }) {
  const [activeTaskView, setActiveTaskView] = useState('blueprint'); // 'blueprint' or 'generation'

  return (
    <div className="task-area-container"> {/* Renamed to develop-area-container in CSS if preferred */}
      <div className="panel-header develop-area-header"> {/* Use specific class for styling this header */}
        <span className="panel-title">Develop</span> {/* CHANGED TITLE */}
        <div className="develop-view-toggle-tabs"> {/* Renamed class for tabs */}
          <button
            className={`view-tab-button ${activeTaskView === 'blueprint' ? 'active' : ''}`}
            onClick={() => setActiveTaskView('blueprint')}
          >
            蓝图
          </button>
          <button
            className={`view-tab-button ${activeTaskView === 'generation' ? 'active' : ''}`}
            onClick={() => setActiveTaskView('generation')}
          >
            生成
          </button>
        </div>
      </div>

      <div className="develop-area-content"> {/* Renamed class for content area */}
        {activeTaskView === 'blueprint' && (
          <AppBlueprintView
            spaceId={spaceId}
            selectedVersion={currentAppBlueprintVersion}
            onVersionChange={onAppBlueprintVersionChange}
          />
        )}
        {activeTaskView === 'generation' && (
          <AppBuildView
            spaceId={spaceId}
            appBlueprintVersion={currentAppBlueprintVersion}
            onAppBlueprintVersionChange={onAppBlueprintVersionChange}
          />
        )}
      </div>
    </div>
  );
}

export default TaskArea;
