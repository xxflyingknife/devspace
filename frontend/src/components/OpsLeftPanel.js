import React, { useState, useEffect } from 'react';
import LoadingSpinner from './LoadingSpinner';
// Add specific CSS if needed: import './OpsLeftPanel.css';

const mockFetchOpsWorkloads = async (spaceId) => {
    await new Promise(resolve => setTimeout(resolve, 400));
    return [
        {id: 'wl-pod-grp-1', name: 'Frontend Pods (prod)', type: 'pods', status: 'Healthy', count: 5},
        {id: 'wl-deploy-db', name: 'Database Deployment (main)', type: 'deployment', status: 'Scaling', count: 1},
        {id: 'wl-svc-api', name: 'API Gateway Service', type: 'service', status: 'Degraded', count: 3},
        {id: 'wl-cron-backup', name: 'Daily Backup CronJob', type: 'cronjob', status: 'Scheduled', count: 1},
    ];
};

function OpsLeftPanel({ spaceId }) {
  const [opsWorkloads, setOpsWorkloads] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!spaceId) return;
    setIsLoading(true);
    setError(null);
    mockFetchOpsWorkloads(spaceId)
        .then(data => setOpsWorkloads(data))
        .catch(err => {
            console.error("Error fetching ops workloads:", err);
            setError("Failed to load workloads.");
        })
        .finally(() => setIsLoading(false));
  }, [spaceId]);

  return (
    <>
      <div className="panel-header">
        <span className="panel-title">Workloads</span>
        {/* Add controls like filter/sort if needed */}
        <button className="panel-header-button" title="Refresh Workloads">🔄</button>
      </div>
      <div className="ops-workload-list-container"> {/* Scrollable container */}
        {isLoading && <LoadingSpinner />}
        {error && <p className="error-message">{error}</p>}
        {!isLoading && !error && opsWorkloads.length > 0 ? (
          <ul className="ops-workload-list">
            {opsWorkloads.map(wl => (
              <li key={wl.id} className="ops-workload-item">
                <span className="workload-icon">{wl.type === 'pods' ? '[□]' : (wl.type === 'deployment' ? '[D]' : '[S]')}</span>
                <span className="workload-name">{wl.name}</span>
                <span className={`workload-status ${wl.status.toLowerCase().replace(' ', '-')}`}>{wl.status}</span>
                <span className="workload-count">{wl.count}</span>
              </li>
            ))}
          </ul>
        ) : (
          !isLoading && <p className="no-workloads-message">No workloads to display for this space.</p>
        )}
      </div>
    </>
  );
}
export default OpsLeftPanel;
