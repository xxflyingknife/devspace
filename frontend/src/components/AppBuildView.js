// frontend/src/components/AppBuildView.js
import React, { useState, useEffect } from 'react';
import LoadingSpinner from './LoadingSpinner';
import './AppBuildView.css'; // Ensure this CSS file has the correct styles

// Mock API call to fetch blueprint versions for THIS view's selector
const mockFetchBlueprintVersionsForBuildView = async (spaceId) => {
  console.log(`BUILD_VIEW: Fetching versions for space: ${spaceId}`);
  await new Promise(resolve => setTimeout(resolve, 150)); // Simulate short delay
  // Should ideally be the same list as AppBlueprintView or a subset if applicable
  return ["1.0.0-alpha", "0.9.0-beta", "0.8.0-initial"];
};

// Mock API call to fetch tasks for a given blueprint version
const mockFetchBuildTasksForVersion = async (spaceId, blueprintVersion) => {
  console.log(`BUILD_VIEW: Fetching build tasks for space: ${spaceId}, blueprint version: ${blueprintVersion}`);
  await new Promise(resolve => setTimeout(resolve, 500));

  if (!blueprintVersion) {
    console.log("BUILD_VIEW: No blueprint version provided, returning empty tasks.");
    return [];
  }

  // Example: Return different tasks or statuses based on version for mock
  const baseTasks = [
    { id: 'task_validate_bp', name: 'Validate Blueprint Integrity', status: 'Completed', dependsOn: [], duration: '2s', logKey: 'validation.log' },
    { id: 'task_db_schema', name: 'Generate DB Schema & Migrations', status: 'Completed', dependsOn: ['task_validate_bp'], duration: '5s', logKey: 'db_schema.log' },
    { id: 'task_data_access_layer', name: 'Scaffold Data Access Layer', status: 'Completed', dependsOn: ['task_db_schema'], duration: '8s', logKey: 'dal.log' },
    { id: 'task_auth_api', name: 'Build Auth API Endpoints', status: 'InProgress', dependsOn: ['task_data_access_layer'], duration: '15s', progress: 60, logKey: 'auth_api.log' },
    { id: 'task_core_logic_stubs', name: 'Generate Core Business Logic Stubs', status: 'Pending', dependsOn: ['task_data_access_layer'], duration: '10s', logKey: 'core_logic.log' },
    { id: 'task_ui_components_base', name: 'Scaffold Base UI Components', status: 'Not Started', dependsOn: [], duration: '12s', logKey: 'ui_components.log' },
  ];

  if (blueprintVersion === "0.9.0-beta") {
    const authTask = baseTasks.find(t => t.id === 'task_auth_api');
    if (authTask) authTask.status = 'Failed'; // Simulate a failed task for this version
    return [
        {id: 'task_legacy_compat_beta', name: 'Setup Legacy Compatibility (Beta)', status: 'Completed', dependsOn: [], duration: '3s'},
        ...baseTasks.slice(0, 3) // Only a few tasks for beta
    ];
  } else if (blueprintVersion === "0.8.0-initial") {
    return baseTasks.slice(0, 2); // Even fewer tasks for initial
  }
  return baseTasks; // Default for 1.0.0-alpha or others
};


function AppBuildView({ spaceId, appBlueprintVersion, onAppBlueprintVersionChange }) {
  const [tasks, setTasks] = useState([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [isLoadingVersions, setIsLoadingVersions] = useState(false);
  const [error, setError] = useState(null);
  const [versions, setVersions] = useState([]);
  // isBuildingAll state was removed

  // Effect 1: Fetch available blueprint versions for the selector
  useEffect(() => {
    if (spaceId) {
      setIsLoadingVersions(true);
      setError(null); // Clear previous errors
      setVersions([]); // Clear previous versions
      console.log("BUILD_VIEW: useEffect - Fetching versions for spaceId:", spaceId);
      mockFetchBlueprintVersionsForBuildView(spaceId)
        .then(fetchedVersions => {
          setVersions(fetchedVersions || []);
          if (fetchedVersions && fetchedVersions.length > 0) {
            // If no appBlueprintVersion is currently selected, or if the current one isn't in the list,
            // default to the first available version.
            if (!appBlueprintVersion || !fetchedVersions.includes(appBlueprintVersion)) {
              if (onAppBlueprintVersionChange) {
                console.log("BUILD_VIEW: Defaulting selected blueprint version to:", fetchedVersions[0]);
                onAppBlueprintVersionChange(fetchedVersions[0]);
              }
            }
          } else { // No versions returned
            if (onAppBlueprintVersionChange) onAppBlueprintVersionChange(null);
          }
        })
        .catch(err => {
          console.error("Error fetching blueprint versions for build view:", err);
          setError("Failed to load blueprint versions.");
        })
        .finally(() => {
          setIsLoadingVersions(false);
        });
    } else {
      setVersions([]); // Clear versions if no spaceId
      if (onAppBlueprintVersionChange) onAppBlueprintVersionChange(null); // Clear selection
    }
  }, [spaceId]); // Re-run only if spaceId changes

  // Effect 2: Fetch tasks when appBlueprintVersion (the selected one) changes
  useEffect(() => {
    if (spaceId && appBlueprintVersion) {
      setIsLoadingTasks(true);
      setError(null); // Clear previous task errors
      setTasks([]); // Clear previous tasks
      console.log("BUILD_VIEW: useEffect - Fetching tasks for spaceId:", spaceId, "and version:", appBlueprintVersion);
      mockFetchBuildTasksForVersion(spaceId, appBlueprintVersion)
        .then(data => {
          setTasks(data || []);
        })
        .catch(err => {
          console.error("Error fetching build tasks:", err);
          setError(`Failed to load build tasks for version ${appBlueprintVersion}.`);
        })
        .finally(() => {
          setIsLoadingTasks(false);
        });
    } else {
      setTasks([]); // Clear tasks if no version is selected
      console.log("BUILD_VIEW: No appBlueprintVersion selected, clearing tasks.");
    }
  }, [spaceId, appBlueprintVersion]); // Re-run if spaceId or the selected appBlueprintVersion changes


  const getStatusIcon = (status) => {
    if (status === 'Completed') return '✅';
    if (status === 'InProgress') return '⚙️';
    if (status === 'Pending') return '⏳';
    if (status === 'Failed') return '❌';
    if (status === 'Not Started') return '➖';
    return '❔';
  };
  
  return (
    <div className="app-build-view">
      <div className="app-build-controls">
        <div className="app-bp-version-selector"> {/* Re-use class from AppBlueprintView for styling */}
          <span className="version-icon">v</span>
          <select 
            id="buildViewBpVersionSelect"
            value={appBlueprintVersion || ''} 
            onChange={(e) => onAppBlueprintVersionChange(e.target.value)}
            disabled={isLoadingVersions || versions.length === 0 || isLoadingTasks}
          >
            {isLoadingVersions && <option value="">Loading Versions...</option>}
            {!isLoadingVersions && versions.length === 0 && <option value="">No Versions Available</option>}
            {versions.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        {/* "Build All" button was removed */}
      </div>

      {/* --- Content Display Logic --- */}
      {isLoadingTasks && (
        <div className="app-build-loading"><LoadingSpinner /> Loading Build Tasks...</div>
      )}
      {!isLoadingTasks && error && (
        <p className="error-message">{error} <button onClick={() => {
            if(onAppBlueprintVersionChange && appBlueprintVersion) onAppBlueprintVersionChange(appBlueprintVersion); // Retry current
            else if(onAppBlueprintVersionChange && versions.length > 0) onAppBlueprintVersionChange(versions[0]); // Retry first
        }}>Retry</button></p>
      )}
      
      {!isLoadingTasks && !error && !appBlueprintVersion && versions.length > 0 && (
          <p className="build-view-placeholder">Please select an Application Blueprint version to view build tasks.</p>
      )}
      {!isLoadingTasks && !error && appBlueprintVersion && tasks.length === 0 && (
        <p className="build-view-placeholder">No build tasks defined for blueprint version {appBlueprintVersion}.</p>
      )}

      {!isLoadingTasks && !error && appBlueprintVersion && tasks.length > 0 && (
        <ul className="timeline">
          {tasks.map((task) => (
            <li key={task.id} className={`timeline-item status-${task.status?.toLowerCase().replace(/\s+/g, '-')}`}>
              <div className="timeline-marker" title={task.status}>{getStatusIcon(task.status)}</div>
              <div className="timeline-content">
                <div className="task-details">
                    <span className="task-name">{task.name}</span>
                    {task.status === 'InProgress' && task.progress !== undefined && (
                        <span className="task-progress-bar"><span style={{ width: `${task.progress}%` }}></span></span>
                    )}
                    {task.duration && <small className="task-meta">Est. Duration: {task.duration}</small>}
                    {task.dependsOn && task.dependsOn.length > 0 && (
                        <small className="task-dependencies">Depends on: {task.dependsOn.join(', ')}</small>
                    )}
                </div>
                {/* Task action buttons (Rebuild, Tune) were removed */}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
export default AppBuildView;


