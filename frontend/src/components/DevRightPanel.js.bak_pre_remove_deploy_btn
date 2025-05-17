import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import Accordion from './Accordion';
import LoadingSpinner from './LoadingSpinner'; // If needed for async data
// Assuming K8sWorkloadDisplay is not used directly, we build the list here

function DevRightPanel({ spaceId }) {
  const [showDeploySettingsModal, setShowDeploySettingsModal] = useState(false);
  const [k8sEnvConfigs, setK8sEnvConfigs] = useState({ // Mock structure
    test: { url: 'kubeconfig-context-test', name: 'Test Environment' },
    grayscale: { url: 'kubeconfig-context-gray', name: 'Grayscale Environment' },
    production: { url: 'kubeconfig-context-prod', name: 'Production Environment' },
  });
  const [currentK8sEnvUrl, setCurrentK8sEnvUrl] = useState(k8sEnvConfigs.test.url); // Example

  // Mock deployments data per environment - replace with API calls
  const [deploymentsData, setDeploymentsData] = useState({
    test: [
      { id: 'test-dep1', name: `${spaceId}-backend-test`, status: 'Running', replicas: '1/1', lastDeployed: '3h ago'},
      { id: 'test-dep2', name: `${spaceId}-frontend-test`, status: 'Running', replicas: '1/1', lastDeployed: '3h ago'},
    ],
    grayscale: [
      { id: 'gray-dep1', name: `${spaceId}-user-service-gray`, status: 'Pending', replicas: '0/1', lastDeployed: '10m ago'},
    ],
    production: [
       { id: 'prod-dep1', name: `${spaceId}-main-app-prod`, status: 'Running', replicas: '5/5', lastDeployed: '1d ago'},
    ]
  });
  const [isLoadingDeployments, setIsLoadingDeployments] = useState(false);
  const [openDeployEnvs, setOpenDeployEnvs] = useState({ test: true, grayscale: false, production: false });

  // TODO: useEffect to fetch actual deployment data for each env based on spaceId and k8sEnvConfigs

  const handleSaveDeploySettings = (e) => {
    e.preventDefault();
    alert(`K8s Deploy Environment configurations would be saved here. Defaulting to: ${currentK8sEnvUrl}`);
    // TODO: Call backend to save these configurations (likely per environment)
    // For simplicity, just closing modal now.
    setShowDeploySettingsModal(false);
  };

  const toggleDeployEnvAccordion = (envKey) => {
    setOpenDeployEnvs(prev => ({ ...prev, [envKey]: !prev[envKey] }));
  };

  return (
    <>
      <div className="panel-header">
        <span className="panel-title">Deployments</span>
        <button className="panel-header-button" onClick={() => setShowDeploySettingsModal(true)} title="Configure K8s Environments">⚙️</button>
      </div>
      <div className="deploy-environments-container"> {/* Scrollable container */}
        {Object.entries(k8sEnvConfigs).map(([key, envConfig]) => (
          <Accordion
            key={key}
            title={envConfig.name}
            initialOpen={openDeployEnvs[key]}
            onToggle={() => toggleDeployEnvAccordion(key)} // Use if Accordion needs external toggle control
            headerClassName="environment-accordion-header" // For specific styling
          >
            {isLoadingDeployments === key ? <LoadingSpinner /> : (
                deploymentsData[key] && deploymentsData[key].length > 0 ? (
                    <ul className="deploy-list">
                    {deploymentsData[key].map(dep => (
                        <li key={dep.id} className="deploy-list-item">
                        <strong className="deploy-name">{dep.name}</strong>
                        <span className={`deploy-status ${dep.status.toLowerCase()}`}>{dep.status}</span>
                        <span className="deploy-replicas">{dep.replicas}</span>
                        <span className="deploy-time">{dep.lastDeployed}</span>
                        <button className="deploy-action-button">[…]</button>
                        </li>
                    ))}
                    </ul>
                ) : <p className="no-deployments-in-env">No deployments in this environment.</p>
            )}
          </Accordion>
        ))}
      </div>

      {showDeploySettingsModal && (
        <Modal isOpen={showDeploySettingsModal} onClose={() => setShowDeploySettingsModal(false)} title="Configure K8s Deploy Environments">
          <form onSubmit={handleSaveDeploySettings} className="modal-form">
            <p><em>Manage K8s contexts or API endpoints for each environment.</em></p>
            {Object.entries(k8sEnvConfigs).map(([key, envConfig]) => (
                 <div className="form-group" key={key}>
                    <label htmlFor={`k8s-env-${key}`}>{envConfig.name} K8s Context/URL:</label>
                    <input
                        type="text"
                        id={`k8s-env-${key}`}
                        value={envConfig.url} // This should be part of a state to be editable
                        onChange={(e) => {
                            const newConfigs = {...k8sEnvConfigs};
                            newConfigs[key].url = e.target.value;
                            setK8sEnvConfigs(newConfigs);
                        }}
                    />
                 </div>
            ))}
            <div className="modal-form-actions">
              <button type="button" className="modal-button secondary" onClick={() => setShowDeploySettingsModal(false)}>Cancel</button>
              <button type="submit" className="modal-button primary">Save Settings</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
export default DevRightPanel;
