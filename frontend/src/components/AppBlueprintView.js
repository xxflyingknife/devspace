// frontend/src/components/AppBlueprintView.js
import React, { useState, useEffect } from 'react';
import LoadingSpinner from './LoadingSpinner';
import Accordion from './Accordion';
import './AppBlueprintView.css'; // Ensure this CSS is correct

// Mock API calls (as previously defined)
const mockFetchAppBlueprint = async (spaceId, version) => {
  console.log(`BLUEPRINT_VIEW: Fetching APP-BP for space: ${spaceId}, version: ${version || 'latest'}`);
  await new Promise(resolve => setTimeout(resolve, 400));
  if (!version) return null; // No version, no blueprint
  const baseBlueprint = {
    metadata: { appName: `Space ${spaceId} App`, appId: `app-${spaceId}`, version: version, description: "A dynamically generated application blueprint.", targetUsers: "Developers, SREs", creationTimestamp: new Date().toISOString(), lastUpdatedTimestamp: new Date().toISOString() },
    functionalModules: [{ moduleId: "auth", moduleName: "User Authentication", description: "Handles user sign-up, login, and session management.", features: [{featureId: "login-email", featureName: "Email/Password Login"},{featureId: "oauth-google", featureName: "Google OAuth Login"}]}],
    dataEntities: [{entityId: "user", entityName: "User", attributes: [{attributeId: "email", attributeName: "Email", dataType: "String(255)"}]}],
    workflows: [{workflowId: "user-registration", workflowName: "User Registration Flow"}],
    views: [{viewId: "dashboard", viewName: "Main Dashboard"}],
    dfxRequirements: { security: {authenticationMethods: ["Email/Password"]}, performance: {concurrentUsers: 100}}
  };
  if (version === "0.9.0-beta") {
    baseBlueprint.metadata.description = "An older beta version of the blueprint.";
    baseBlueprint.functionalModules = [{ moduleId: "legacy_auth", moduleName: "Legacy Auth", features: [] }];
  }
  return baseBlueprint;
};
const mockFetchBlueprintVersions = async (spaceId) => {
    console.log(`BLUEPRINT_VIEW: Fetching versions for space: ${spaceId}`);
    await new Promise(resolve => setTimeout(resolve, 200));
    return ["1.0.0-alpha", "0.9.0-beta", "0.8.0-initial"];
};

function AppBlueprintView({ spaceId, selectedVersion, onVersionChange }) {
  const [blueprint, setBlueprint] = useState(null);
  const [versions, setVersions] = useState([]);
  const [showJsonView, setShowJsonView] = useState(false);
  const [isLoadingVersions, setIsLoadingVersions] = useState(false);
  const [isLoadingBlueprint, setIsLoadingBlueprint] = useState(false);
  const [error, setError] = useState(null);

  // Fetch available versions
  useEffect(() => {
    if (spaceId) {
      setIsLoadingVersions(true); setError(null); setVersions([]);
      mockFetchBlueprintVersions(spaceId)
        .then(fetchedVersions => {
          const validVersions = fetchedVersions || [];
          setVersions(validVersions);
          if (validVersions.length > 0) {
            // If no version is selected, or selected version not in new list, select the first one
            if (!selectedVersion || !validVersions.includes(selectedVersion)) {
              if (onVersionChange) onVersionChange(validVersions[0]);
            }
          } else { // No versions found
            if (onVersionChange) onVersionChange(null);
          }
        })
        .catch(err => { setError("Failed to load blueprint versions."); console.error(err); })
        .finally(() => setIsLoadingVersions(false));
    } else {
      setVersions([]);
      if (onVersionChange) onVersionChange(null); // Clear selection if no spaceId
    }
  }, [spaceId]); // Re-fetch versions ONLY when spaceId changes

  // Fetch specific blueprint when selectedVersion changes
  useEffect(() => {
    if (spaceId && selectedVersion) {
      setIsLoadingBlueprint(true); setError(null); setBlueprint(null);
      mockFetchAppBlueprint(spaceId, selectedVersion)
        .then(data => setBlueprint(data))
        .catch(err => { setError(`Failed to load blueprint v${selectedVersion}.`); console.error(err); })
        .finally(() => setIsLoadingBlueprint(false));
    } else {
      setBlueprint(null); // Clear blueprint if no version selected
    }
  }, [spaceId, selectedVersion]); // Re-fetch blueprint if spaceId or selectedVersion changes


  const renderHumanReadableSectionContent = (data) => { /* ... (same as before, ensure it handles empty data gracefully) ... */ 
    if (!data || (typeof data === 'object' && Object.keys(data).length === 0 && !Array.isArray(data)) || (Array.isArray(data) && data.length === 0) ) {
        return <p className="bp-empty-section"><em>(No details in this section)</em></p>;
    }
    // Rest of the rendering logic
    if (Array.isArray(data)) {
      return (<ul> {data.map((item, index) => ( <li key={item.id || item.moduleId || item.featureId || item.entityId || item.workflowId || item.viewId || index}> <strong>{item.name || item.moduleName || item.featureName || item.entityName || item.workflowName || item.viewName || `Item ${index + 1}`}</strong> {item.description && `: ${item.description}`} </li> ))} </ul>);
    }
    if (typeof data === 'object') {
      return (<ul> {Object.entries(data).map(([key, value]) => ( <li key={key}><strong>{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:</strong> {typeof value === 'object' ? JSON.stringify(value) : String(value)}</li> ))} </ul>);
    }
    return <p>{String(data)}</p>;
  };

  return (
    <div className="app-blueprint-view">
      <div className="app-bp-controls"> {/* This is the "toolbar" for this view */}
        <div className="app-bp-version-selector">
          <span className="version-icon">v</span>
          <select 
            id="bpVersionSelectInView" // Unique ID
            value={selectedVersion || ''} 
            onChange={(e) => onVersionChange(e.target.value)}
            disabled={isLoadingVersions || versions.length === 0 || isLoadingBlueprint}
          >
            {isLoadingVersions && <option value="">Loading Versions...</option>}
            {!isLoadingVersions && versions.length === 0 && <option value="">No Versions Available</option>}
            {versions.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div className="app-bp-view-toggle">
          <button onClick={() => setShowJsonView(!showJsonView)} className={`control-button ${showJsonView ? '' : 'active'}`}>
            {showJsonView ? 'Accordion View' : 'JSON View'}
          </button>
        </div>
      </div>

      {isLoadingBlueprint && <div className="app-bp-loading"><LoadingSpinner /> Loading Blueprint Data...</div>}
      {error && <p className="error-message">{error}</p>}
      
      {!isLoadingBlueprint && !error && !selectedVersion && versions.length > 0 && (
        <p className="select-version-prompt">Please select a blueprint version to view details.</p>
      )}

      {!isLoadingBlueprint && !error && blueprint && (
        showJsonView ? (
          <pre className="app-bp-json-view">{JSON.stringify(blueprint, null, 2)}</pre>
        ) : (
          <div className="app-bp-accordion-view">
            {Object.entries(blueprint).length > 0 ? Object.entries(blueprint).map(([key, value]) => {
              // Only render accordion if value is meaningful
              if (value === null || value === undefined || (Array.isArray(value) && value.length === 0) || (typeof value === 'object' && Object.keys(value).length === 0 && !Array.isArray(value))) {
                return null;
              }
              const prettyKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
              return (
                <Accordion title={prettyKey} key={key} initialOpen={key === 'metadata' || key === 'functionalModules'}>
                  {renderHumanReadableSectionContent(value)}
                </Accordion>
              );
            }) : <p>Blueprint data is empty or not in expected format.</p>}
          </div>
        )
      )}
      {!isLoadingBlueprint && !error && !blueprint && selectedVersion && (
          <p>No blueprint data found for version {selectedVersion}.</p>
      )}
    </div>
  );
}
export default AppBlueprintView;


