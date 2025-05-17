// frontend/src/components/DeploymentsPanel.js
import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import Accordion from './Accordion';
import LoadingSpinner from './LoadingSpinner';
import './DeploymentsPanel.css'; // Create this CSS file

function DeploymentsPanel({ spaceId }) {
  const [showDeploySettingsModal, setShowDeploySettingsModal] = useState(false);
  const [k8sEnvConfigs, setK8sEnvConfigs] = useState({
    test: { url: 'kubeconfig-context-test', name: 'Test Environment' },
    grayscale: { url: 'kubeconfig-context-gray', name: 'Grayscale Environment' },
    production: { url: 'kubeconfig-context-prod', name: 'Production Environment' },
  });
  const [deploymentsData, setDeploymentsData] = useState({
    test: [{ id: `test-${spaceId}-dep1`, name: `${spaceId}-backend-test`, status: 'Running', replicas: '1/1', lastDeployed: '3h ago'}],
    grayscale: [],
    production: [{ id: `prod-${spaceId}-dep1`, name: `${spaceId}-main-app-prod`, status: 'Running', replicas: '5/5', lastDeployed: '1d ago'}]
  });
  const [isLoadingDeployments, setIsLoadingDeployments] = useState(false);
  const [openDeployEnvs, setOpenDeployEnvs] = useState({ test: true, grayscale: false, production: false });

  // TODO: useEffect to fetch actual k8sEnvConfigs and deploymentsData based on spaceId

  const handleSaveDeploySettings = (e) => {
    e.preventDefault();
    alert(`K8s Deploy Environment configurations saved (mock).`);
    // In a real app, you would probably pass the k8sEnvConfigs state up or use a global state/context
    // For now, we assume this modal might update something that this component then re-reads or is passed.
    setShowDeploySettingsModal(false);
  };

  // Accordion now manages its own state, toggleDeployEnvAccordion removed
  // const toggleDeployEnvAccordion = (envKey) => {
  //   setOpenDeployEnvs(prev => ({ ...prev, [envKey]: !prev[envKey] }));
  // };

  return (
    <div className="deployments-panel-content"> {/* Renamed container class */}
      <div className="panel-header">
        <span className="panel-title">Deployments</span>
        <div className="panel-header-actions">
          <button className="panel-header-button" onClick={() => setShowDeploySettingsModal(true)} title="Configure K8s Environments">⚙️</button>
        </div>
      </div>
      <div className="deploy-environments-container"> {/* This part scrolls */}
        {isLoadingDeployments && <div style={{padding: '20px', textAlign: 'center'}}><LoadingSpinner/> <p>Loading deployments...</p></div>}
        {!isLoadingDeployments && Object.entries(k8sEnvConfigs).map(([key, envConfig]) => (
          <Accordion
            key={key}
            title={envConfig.name}
            initialOpen={openDeployEnvs[key]} // Accordion uses this for initial state
            // onToggle prop removed if Accordion handles its own state
            headerClassName="environment-accordion-header" // Specific class for these accordions
          >
            {deploymentsData[key] && deploymentsData[key].length > 0 ? (
                <ul className="deploy-list">
                {deploymentsData[key].map(dep => (
                    <li key={dep.id} className="deploy-list-item">
                    <strong className="deploy-name">{dep.name}</strong>
                    <span className={`deploy-status ${dep.status.toLowerCase()}`}>{dep.status}</span>
                    <span className="deploy-replicas">{dep.replicas}</span>
                    <span className="deploy-time">{dep.lastDeployed}</span>
                    <button className="deploy-action-button" onClick={() => alert(`Actions for ${dep.name}`)}>…</button>
                    </li>
                ))}
                </ul>
            ) : <p className="no-deployments-in-env">No deployments in this environment.</p>}
          </Accordion>
        ))}
      </div>

      {showDeploySettingsModal && (
        <Modal isOpen={showDeploySettingsModal} onClose={() => setShowDeploySettingsModal(false)} title="Configure K8s Deploy Environments">
          <form onSubmit={handleSaveDeploySettings} className="modal-form">
            <p><em>Manage K8s contexts or API endpoints for each environment.</em></p>
            {Object.entries(k8sEnvConfigs).map(([key, envConfig]) => (
                 <div className="form-group" key={key}>
                    <label htmlFor={`k8s-env-${key}-${spaceId}`}>{envConfig.name} K8s Context/URL:</label>
                    <input
                        type="text"
                        id={`k8s-env-${key}-${spaceId}`} // Unique ID using spaceId
                        defaultValue={envConfig.url} // Use defaultValue if not fully controlled by state here
                        onChange={(e) => {
                            const newConfigs = {...k8sEnvConfigs};
                            newConfigs[key] = { ...newConfigs[key], url: e.target.value };
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
    </div>
  );
}

export default DeploymentsPanel;


