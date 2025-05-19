// frontend/src/pages/SpaceDetailPage.js
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import DevLeftPanel from '../components/DevLeftPanel';
import DevRightPanel from '../components/DevRightPanel';
import OpsLeftPanel from '../components/OpsLeftPanel';
import OpsRightPanel from '../components/OpsRightPanel';
import ChatInterface from '../components/ChatInterface';
import LoadingSpinner from '../components/LoadingSpinner';
import SpaceChatOrchestrator from '../components/SpaceChatOrchestrator'; // <--- IMPORT NEW
// ...
import './SpaceDetailPage.css';

const API_BASE_URL = 'http://localhost:5001/api'; // Ensure this is correct

const fetchSpaceDetailsFromAPI = async (spaceId) => {
    console.log(`SpaceDetailPage: Fetching REAL details for space: ${spaceId} from backend`);
    try {
        const response = await fetch(`${API_BASE_URL}/spaces/${spaceId}/details`);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: response.statusText, error: `HTTP ${response.status}` }));
            throw new Error(`Backend error: ${response.status} - ${errorData.error || 'Failed to fetch space details'}`);
        }
        const data = await response.json();
        console.log("SpaceDetailPage: Received details from backend:", data);
        if (!data || !data.type || !data.name) { // Basic validation for necessary fields
            throw new Error("Received invalid or incomplete data structure from backend for space details.");
        }
        return data;
    } catch (error) {
        console.error("SpaceDetailPage: Error in fetchSpaceDetailsFromAPI:", error);
        throw error;
    }
};

function SpaceDetailPage({ onSetHeaderProps }) { // Receive onSetHeaderProps as a prop
  const [spaceDetails, setSpaceDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const params = useParams(); // Get the whole params object
  const { spaceIdFromRoute } = params; // Then destructure

  // Theme and global drawer states are managed by App.js

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    console.log(`SpaceDetailPage useEffect triggered for spaceIdFromRoute: ${spaceIdFromRoute}`);
    
    if (spaceIdFromRoute) {
        fetchSpaceDetailsFromAPI(spaceIdFromRoute)
          .then(data => {
            setSpaceDetails(data);
            // After fetching details, update the header props in App.js
            if (onSetHeaderProps && data) {
              onSetHeaderProps({
                spaceId: data.id, // Use id from fetched data
                spaceName: data.name,
                spaceType: data.type
              });
            } else if (!data && onSetHeaderProps) { // If API returns no data for this ID
                onSetHeaderProps({ spaceId: spaceIdFromRoute, spaceName: "Not Found", spaceType: null });
            }
          })
          .catch(err => {
            console.error("Error fetching space details in SpaceDetailPage useEffect:", err);
            setError(err.message || "无法加载空间详情");
            if (onSetHeaderProps) { // Update header even on error to show something
                onSetHeaderProps({ spaceId: spaceIdFromRoute, spaceName: "Error Loading", spaceType: null });
            }
          })
          .finally(() => setIsLoading(false));
    } else {
        setError("No Space ID provided in URL.");
        setIsLoading(false);
        if (onSetHeaderProps) {
            onSetHeaderProps({ spaceId: null, spaceName: null, spaceType: null });
        }
    }
  }, [spaceIdFromRoute, onSetHeaderProps]); // Dependency array

  // Clear header info when component unmounts or spaceIdFromUrl changes (before new data is set)
  useEffect(() => {
    return () => {
      if (onSetHeaderProps) {
        // console.log("SpaceDetailPage: Clearing header info on unmount/spaceId change");
        // onSetHeaderProps({ spaceId: null, spaceName: null, spaceType: null });
        // This might be too aggressive if App.js already clears it based on location.
        // App.js's clearing logic based on location.pathname is likely sufficient.
      }
    };
  }, [onSetHeaderProps]); // Removed spaceIdFromUrl to avoid clearing too eagerly before new props are set


  if (isLoading) return (
    <main className="space-detail-page-main-content only-loader">
        <div className="loading-fullpage"><LoadingSpinner /> 加载空间详情...</div>
    </main>
  );
  if (error) return (
    <main className="space-detail-page-main-content only-loader">
        <div className="error-fullpage">{error}</div>
    </main>
  );
  if (!spaceDetails || !spaceDetails.type) return (
    <main className="space-detail-page-main-content only-loader">
        <div className="error-fullpage">无法加载空间数据或空间类型未知 ({spaceIdFromRoute})。请返回列表重试。</div>
    </main>
  );

  return (
    <main className="three-column-layout space-detail-page-main-content">
      <div className="column left-column">
        {spaceDetails.type === 'dev' ? (
          <DevLeftPanel spaceId={spaceDetails.id} initialRepoUrl={spaceDetails.git_repo_url} />
        ) : (
          <OpsLeftPanel spaceId={spaceDetails.id} />
        )}
      </div>

      <div className="column middle-column">
        {spaceDetails && spaceDetails.type && ( // Ensure spaceDetails and type are loaded
            <SpaceChatOrchestrator 
                spaceId={spaceDetails.id} 
                spaceType={spaceDetails.type} 
            />
        )}
      </div>

      <div className="column right-column">
        {spaceDetails.type === 'dev' ? (
          <DevRightPanel spaceId={spaceDetails.id} />
        ) : (
          <OpsRightPanel spaceId={spaceDetails.id} />
        )}
      </div>
      {/* Global Drawers (Help, Feedback) and SpaceSettingsModal, PluginMarketModal are rendered by App.js */}
    </main>
  );
}

export default SpaceDetailPage;
