// frontend/src/pages/SpaceDetailPage.js
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
// Header is now likely rendered globally by App.js, or SpaceDetailPage passes necessary props to it
// For simplicity, if App.js renders Header, we don't re-render it here unless specific props are needed
// that App.js doesn't have. Let's assume for now App.js's Header is sufficient.
// If not, uncomment and pass props: import Header from '../components/Header';

import DevLeftPanel from '../components/DevLeftPanel';
import DevRightPanel from '../components/DevRightPanel';
import OpsLeftPanel from '../components/OpsLeftPanel';
import OpsRightPanel from '../components/OpsRightPanel';
import ChatInterface from '../components/ChatInterface';
// Drawer and PluginMarketModal are now likely global in App.js
// import Drawer from '../components/Drawer';
import LoadingSpinner from '../components/LoadingSpinner';
import './SpaceDetailPage.css';

// Mock data/functions (replace with actual API calls)
const fetchSpaceDetailsFromAPI = async (spaceId) => { // Renamed from mockFetch...
    console.log(`SpaceDetailPage: Fetching REAL details for space: ${spaceId} from backend`);
    try {
        const response = await fetch(`http://localhost:5001/api/spaces/${spaceId}/details`);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: response.statusText }));
            throw new Error(`Backend error: ${response.status} - ${errorData.error || 'Failed to fetch space details'}`);
        }
        const data = await response.json();
        console.log("SpaceDetailPage: Received details from backend:", data);
        if (!data || !data.type) { // Basic validation
            throw new Error("Received invalid data structure from backend for space details.");
        }
        return data;
    } catch (error) {
        console.error("SpaceDetailPage: Error in fetchSpaceDetailsFromAPI:", error);
        throw error;
    }
};


function SpaceDetailPage() {
  const { spaceId } = useParams();
  const [spaceDetails, setSpaceDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Theme and global drawer states are now managed by App.js

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    console.log(`SpaceDetailPage useEffect triggered for spaceId: ${spaceId}`);
    fetchSpaceDetailsFromAPI(spaceId)
      .then(data => {
        setSpaceDetails(data); // Assumes data includes { id, name, type, description, ... }
      })
      .catch(err => {
        console.error("Error fetching space details in useEffect (SpaceDetailPage):", err);
        setError(err.message || "无法加载空间详情");
      })
      .finally(() => setIsLoading(false));
  }, [spaceId]);


  if (isLoading) return (
    // If Header is global in App.js, we don't need to render a placeholder one here
    // <div className="space-detail-page-wrapper"> {/* Optional wrapper if Header is not here */}
        <div className="loading-fullpage"><LoadingSpinner /> 加载空间详情...</div>
    // </div>
  );
  if (error) return (
    // <div className="space-detail-page-wrapper">
        <div className="error-fullpage">{error}</div>
    // </div>
  );
  if (!spaceDetails || !spaceDetails.type) return ( // Important check
    // <div className="space-detail-page-wrapper">
        <div className="error-fullpage">无法加载空间数据或空间类型未知 ({spaceId})。请返回列表重试。</div>
    // </div>
  );

  // If Header is managed globally by App.js, SpaceDetailPage doesn't render its own Header.
  // Instead, App.js's Header would need to dynamically get spaceName and spaceType
  // (e.g., via React Context or by having SpaceDetailPage update App.js state).
  // For now, let's assume Header is still needed here to pass spaceName and spaceType if it's not global.
  // If Header is truly global in App.js, you'd remove this <Header> instance.

  return (
    // The class "space-detail-page" should be on a wrapper div if Header is not rendered here,
    // or directly on the main div if Header IS rendered here.
    // Assuming App.js handles the main page div and Header, this component just provides the <main> content.
    <main className="three-column-layout space-detail-page-main-content"> {/* Changed to main tag, class for clarity */}
      <div className="column left-column">
        {spaceDetails.type === 'dev' ? (
          <DevLeftPanel spaceId={spaceId} initialRepoUrl={spaceDetails.git_repo_url} />
        ) : (
          <OpsLeftPanel spaceId={spaceId} />
        )}
      </div>

      <div className="column middle-column">
        <ChatInterface spaceId={spaceId} spaceType={spaceDetails.type} />
      </div>

      <div className="column right-column">
        {spaceDetails.type === 'dev' ? (
          <DevRightPanel spaceId={spaceId} />
        ) : (
          <OpsRightPanel spaceId={spaceId} />
        )}
      </div>
      {/* Drawers are now global in App.js */}
    </main>
  );
}

export default SpaceDetailPage;


