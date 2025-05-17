// frontend/src/components/OpsLeftPanel.js
import React, { useState, useEffect } from 'react';
import LoadingSpinner from './LoadingSpinner';
import Modal from './Modal'; // Import Modal component
import './OpsLeftPanel.css'; // Ensure this CSS file exists or styles are global

// Mock data functions (replace with actual API calls)
const mockFetchOpsWorkloads = async (spaceId) => {
    console.log(`Fetching Ops Workloads for spaceId: ${spaceId}`);
    await new Promise(resolve => setTimeout(resolve, 400));
    return [
        {id: 'wl-pod-grp-1', name: 'Frontend Pods (prod)', type: 'pods', status: 'Healthy', count: 5, namespace: 'prod-ns'},
        {id: 'wl-deploy-db', name: 'Database Deployment (main)', type: 'deployment', status: 'Scaling', count: 1, namespace: 'default'},
        {id: 'wl-svc-api', name: 'API Gateway Service', type: 'service', status: 'Degraded', count: 3, namespace: 'prod-ns'},
        {id: 'wl-cron-backup', name: 'Daily Backup CronJob', type: 'cronjob', status: 'Scheduled', count: 1, namespace: 'kube-system'},
    ];
};

// Simulate fetching K8s resource types and specific resources for the "Add Workload" modal
const mockFetchK8sResourceTypes = async () => {
    await new Promise(resolve => setTimeout(resolve, 200));
    return ['pods', 'deployments', 'services', 'statefulsets', 'daemonsets', 'cronjobs', 'nodes'];
};

const mockFetchK8sResources = async (namespace, resourceType) => {
    console.log(`Fetching K8s resources: ns=${namespace}, type=${resourceType}`);
    await new Promise(resolve => setTimeout(resolve, 300));
    // Mock based on type
    if (resourceType === 'pods') {
        return [
            {id: 'pod-1-abc', name: `example-pod-1-abc`}, {id: 'pod-2-def', name: `another-pod-2-def`}, {id: 'frontend-pod-xyz', name: 'frontend-pod-xyz-123'}
        ];
    }
    if (resourceType === 'deployments') {
        return [ {id: 'dep-main-db', name: 'main-database-deployment'}, {id: 'dep-user-svc', name: 'user-service-deployment'} ];
    }
    return [{id: `res-${resourceType}-1`, name: `sample-${resourceType}-1`}];
};

const mockDiscoverWorkloadsByPrompt = async (prompt) => {
    console.log("Discovering workloads with prompt:", prompt);
    await new Promise(resolve => setTimeout(resolve, 1000));
    return [ // Mocked recommendations
        {id: 'rec-pod-grp-frontend', name: 'Frontend Application Pods', type: 'pods', namespace: 'prod-ns', reason: 'Matches "frontend performance"' },
        {id: 'rec-deploy-backend', name: 'Backend API Deployment', type: 'deployment', namespace: 'prod-ns', reason: 'High CPU usage pattern detected' },
    ];
};


function OpsLeftPanel({ spaceId }) {
  const [opsWorkloads, setOpsWorkloads] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // State for Modals
  const [showAddWorkloadModal, setShowAddWorkloadModal] = useState(false);
  const [showDiscoverModal, setShowDiscoverModal] = useState(false);
  const [showRefreshConfirmModal, setShowRefreshConfirmModal] = useState(false);

  // State for "Add Workload" Modal
  const [availableResourceTypes, setAvailableResourceTypes] = useState([]);
  const [selectedResourceType, setSelectedResourceType] = useState('');
  const [selectedNamespace, setSelectedNamespace] = useState('default'); // Or load namespaces
  const [availableResources, setAvailableResources] = useState([]);
  const [chosenResources, setChosenResources] = useState([]); // IDs of chosen resources
  const [isFetchingResources, setIsFetchingResources] = useState(false);

  // State for "Discover Workload" Modal
  const [discoveryPrompt, setDiscoveryPrompt] = useState('');
  const [discoveredWorkloads, setDiscoveredWorkloads] = useState([]);
  const [isDiscovering, setIsDiscovering] = useState(false);

  const fetchWorkloadsData = () => {
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
  };

  useEffect(() => {
    fetchWorkloadsData();
  }, [spaceId]);

  // Fetch resource types for "Add Workload" modal when it opens
  useEffect(() => {
    if (showAddWorkloadModal) {
      mockFetchK8sResourceTypes().then(types => {
          setAvailableResourceTypes(types);
          if (types.length > 0) {
            setSelectedResourceType(types[0]); // Select first type by default
          }
      });
    }
  }, [showAddWorkloadModal]);

  // Fetch specific resources when namespace or resource type changes in "Add Workload" modal
  useEffect(() => {
    if (showAddWorkloadModal && selectedNamespace && selectedResourceType) {
      setIsFetchingResources(true);
      mockFetchK8sResources(selectedNamespace, selectedResourceType)
        .then(resources => setAvailableResources(resources))
        .finally(() => setIsFetchingResources(false));
    } else {
      setAvailableResources([]);
    }
  }, [showAddWorkloadModal, selectedNamespace, selectedResourceType]);


  const handleRefreshWorkloads = () => {
    setShowRefreshConfirmModal(false); // Close confirmation
    fetchWorkloadsData(); // Call the actual refresh logic
    alert("Workloads refreshed (mocked)!");
  };

  const handleAddWorkloadSubmit = (e) => {
    e.preventDefault();
    console.log("Adding chosen workloads:", chosenResources, "Type:", selectedResourceType, "Namespace:", selectedNamespace);
    // TODO: API call to backend to actually add these workloads to the space's monitored list
    setOpsWorkloads(prev => [...prev, ...chosenResources.map(id => {
        const res = availableResources.find(r => r.id === id);
        return { // Create a new workload item structure
            id: id,
            name: res ? res.name : id,
            type: selectedResourceType,
            status: 'Monitoring',
            count: 1, // Placeholder
            namespace: selectedNamespace
        };
    })]);
    setShowAddWorkloadModal(false);
    setChosenResources([]);
  };

  const handleResourceSelectionChange = (resourceId) => {
    setChosenResources(prev =>
      prev.includes(resourceId)
        ? prev.filter(id => id !== resourceId)
        : [...prev, resourceId]
    );
  };

  const handleDiscoverSubmit = async (e) => {
    e.preventDefault();
    if (!discoveryPrompt.trim()) return;
    setIsDiscovering(true);
    setDiscoveredWorkloads([]);
    try {
        const results = await mockDiscoverWorkloadsByPrompt(discoveryPrompt);
        setDiscoveredWorkloads(results);
    } catch(err) {
        alert("Error discovering workloads: " + err.message);
    } finally {
        setIsDiscovering(false);
    }
  };

  const handleAddDiscoveredWorkloads = () => {
      console.log("Adding discovered workloads:", discoveredWorkloads.filter(w => w.selected)); // Assuming a 'selected' property is added
      // TODO: API call to add these. For now, mock adding to UI.
      const newWorkloadsToAdd = discoveredWorkloads.filter(w => w.selected).map(dw => ({
          id: dw.id,
          name: dw.name,
          type: dw.type,
          status: 'Monitoring',
          count: 1, // Placeholder
          namespace: dw.namespace
      }));
      setOpsWorkloads(prev => [...prev, ...newWorkloadsToAdd]);
      setShowDiscoverModal(false);
      setDiscoveryPrompt('');
      setDiscoveredWorkloads([]);
  };

  const handleDiscoveredWorkloadSelection = (workloadId) => {
      setDiscoveredWorkloads(prev => prev.map(w =>
        w.id === workloadId ? { ...w, selected: !w.selected } : w
      ));
  };


  return (
    <>
      <div className="panel-header ops-left-panel-header"> {/* Added specific class */}
        <span className="panel-title">Workloads</span>
        <div className="panel-header-actions">
            <button className="panel-header-button" onClick={() => setShowAddWorkloadModal(true)} title="Add Workload Manually">
                + {/* Add Icon */}
            </button>
            <button className="panel-header-button" onClick={() => setShowDiscoverModal(true)} title="Discover Workloads with AI">
                ✨ {/* Discover Icon */}
            </button>
            <button className="panel-header-button" onClick={() => setShowRefreshConfirmModal(true)} title="Refresh Workloads">
                🔄 {/* Refresh Icon */}
            </button>
        </div>
      </div>
      <div className="ops-workload-list-container">
        {isLoading && <LoadingSpinner />}
        {error && <p className="error-message">{error}</p>}
        {!isLoading && !error && opsWorkloads.length > 0 ? (
          <ul className="ops-workload-list">
            {opsWorkloads.map(wl => (
              <li key={wl.id} className="ops-workload-item">
                <span className="workload-icon">{wl.type === 'pods' ? '□' : (wl.type === 'deployment' ? 'D' : (wl.type === 'service' ? 'S' : 'C'))}</span>
                <span className="workload-name">{wl.name}</span>
                <span className={`workload-status ${wl.status?.toLowerCase().replace(' ', '-')}`}>{wl.status}</span>
                <span className="workload-count">{wl.count}</span>
                 {/* Add a small menu per item if needed later */}
              </li>
            ))}
          </ul>
        ) : (
          !isLoading && <p className="no-workloads-message">No workloads to display for this space. Add or discover them!</p>
        )}
      </div>

      {/* Add Workload Modal */}
      <Modal
        isOpen={showAddWorkloadModal}
        onClose={() => setShowAddWorkloadModal(false)}
        title="Add Workload to Monitor"
        footerContent={
          <>
            <button type="button" className="modal-button secondary" onClick={() => setShowAddWorkloadModal(false)}>Cancel</button>
            <button type="submit" form="add-workload-form" className="modal-button primary">Add Selected</button>
          </>
        }
      >
        <form id="add-workload-form" className="modal-form add-workload-form" onSubmit={handleAddWorkloadSubmit}>
          <div className="form-group">
            <label htmlFor="aw-namespace">Namespace:</label>
            <input type="text" id="aw-namespace" value={selectedNamespace} onChange={(e) => setSelectedNamespace(e.target.value)} placeholder="e.g., default"/>
            {/* TODO: Could be a select populated from API */}
          </div>
          <div className="form-group">
            <label htmlFor="aw-resourceType">Resource Type:</label>
            <select id="aw-resourceType" value={selectedResourceType} onChange={(e) => setSelectedResourceType(e.target.value)}>
              <option value="">-- Select Type --</option>
              {availableResourceTypes.map(type => <option key={type} value={type}>{type}</option>)}
            </select>
          </div>
          <div className="form-group resource-selection-group">
            <label>Available Resources in '{selectedNamespace}' of type '{selectedResourceType}':</label>
            {isFetchingResources ? <LoadingSpinner /> : (
              availableResources.length > 0 ? (
                <ul className="resource-checkbox-list">
                  {availableResources.map(res => (
                    <li key={res.id}>
                      <input
                        type="checkbox"
                        id={`res-${res.id}`}
                        checked={chosenResources.includes(res.id)}
                        onChange={() => handleResourceSelectionChange(res.id)}
                      />
                      <label htmlFor={`res-${res.id}`}>{res.name}</label>
                    </li>
                  ))}
                </ul>
              ) : <p>No resources found or select namespace/type.</p>
            )}
          </div>
          {/* TODO: Add dynamic input for "New Type" if not in select */}
        </form>
      </Modal>

      {/* Discover Workloads Modal */}
      <Modal
        isOpen={showDiscoverModal}
        onClose={() => setShowDiscoverModal(false)}
        title="Discover Workloads via Prompt"
        // Footer for this modal will be inside if we list discovered items
      >
        <form className="modal-form" onSubmit={handleDiscoverSubmit}>
          <div className="form-group">
            <label htmlFor="discoveryPrompt">Describe workloads to find:</label>
            <textarea
              id="discoveryPrompt"
              rows="3"
              value={discoveryPrompt}
              onChange={(e) => setDiscoveryPrompt(e.target.value)}
              placeholder="e.g., 'Show me high CPU consuming pods in prod', 'Find all frontend deployments'..."
            />
          </div>
          <button type="submit" className="modal-button primary discover-button" disabled={isDiscovering}>
            {isDiscovering ? 'Discovering...' : 'Discover'}
          </button>
        </form>
        {isDiscovering && <LoadingSpinner />}
        {discoveredWorkloads.length > 0 && (
          <div className="discovered-workloads-results">
            <h4>Recommended Workloads:</h4>
            <ul className="resource-checkbox-list">
              {discoveredWorkloads.map(wl => (
                <li key={wl.id}>
                  <input type="checkbox" id={`disc-${wl.id}`} checked={!!wl.selected} onChange={() => handleDiscoveredWorkloadSelection(wl.id)} />
                  <label htmlFor={`disc-${wl.id}`}>{wl.name} ({wl.type} in {wl.namespace}) - <em>{wl.reason}</em></label>
                </li>
              ))}
            </ul>
            <div className="modal-form-actions">
                <button type="button" className="modal-button secondary" onClick={() => setShowDiscoverModal(false)}>Cancel</button>
                <button type="button" className="modal-button primary" onClick={handleAddDiscoveredWorkloads}>Add Selected to Monitor</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Confirm Refresh Modal */}
      <Modal
        isOpen={showRefreshConfirmModal}
        onClose={() => setShowRefreshConfirmModal(false)}
        title="Confirm Refresh"
        footerContent={
            <>
              <button type="button" className="modal-button secondary" onClick={() => setShowRefreshConfirmModal(false)}>Cancel</button>
              <button type="button" className="modal-button primary" onClick={handleRefreshWorkloads}>Refresh Now</button>
            </>
        }
      >
        <p>Are you sure you want to fetch the latest status for all monitored workloads in this space?</p>
      </Modal>
    </>
  );
}
export default OpsLeftPanel;


