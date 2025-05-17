// frontend/src/components/DevLeftPanel.js
import React, { useState, useEffect } from 'react';
import FileTreeViewer from './FileTreeViewer';
import TaskArea from './TaskArea'; // This component has "Develop" title and "蓝图"/"生成" tabs
import Modal from './Modal';
import LoadingSpinner from './LoadingSpinner';
import './DevLeftPanel.css'; // Ensure this CSS handles the split layout correctly

const API_BASE_URL = 'http://localhost:5001/api'; // Adjust if your backend URL is different

// Fetches core space details including git_repo_url for dev spaces
const fetchDevSpaceCoreConfig = async (spaceId) => {
  console.log(`DevLeftPanel: Fetching core config for Dev Space ${spaceId} from backend`);
  try {
    const response = await fetch(`${API_BASE_URL}/spaces/${spaceId}/details`);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText, error: `HTTP ${response.status}` }));
      throw new Error(`Backend error: ${response.status} - ${errorData.error || 'Failed to fetch space details'}`);
    }
    const data = await response.json();
    console.log("DevLeftPanel: Received core config from backend:", data);
    if (data && data.id) { // Check for a valid object with at least an id
      if (data.type === 'dev') {
        return data; // Expect { id, name, type, description, git_repo_url, default_branch, ... }
      } else {
        throw new Error(`Space ID ${spaceId} is not configured as a DEV type space (type: ${data.type}).`);
      }
    } else {
      throw new Error("Invalid or incomplete data received for space details from backend.");
    }
  } catch (error) {
    console.error("DevLeftPanel: Error in fetchDevSpaceCoreConfig:", error);
    throw error; // Re-throw to be caught by the caller's .catch()
  }
};

// API call to update/set the git_repo_url for a dev space
const setGitRepoUrlAPI = async (spaceId, gitRepoUrl) => {
  console.log(`DevLeftPanel: Setting Git repo URL for space ${spaceId} to: ${gitRepoUrl}`);
  try {
    const response = await fetch(`${API_BASE_URL}/dev/${spaceId}/git-config`, { // Ensure this endpoint is correct
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ git_repo_url: gitRepoUrl }),
    });
    const result = await response.json();
    if (!response.ok) {
        throw new Error(result.error || `Failed to update Git config: ${response.statusText}`);
    }
    console.log("DevLeftPanel: Git repo URL save response:", result);
    return result; // Expect { success: true, message: "...", git_repo_url: "..." (or full updated space object) }
  } catch (error) {
    console.error("DevLeftPanel: Error in setGitRepoUrlAPI:", error);
    throw error;
  }
};

// Mock functions for "Create New Project" wizard
const mockFetchProjectTypes = async () => {
    await new Promise(resolve => setTimeout(resolve, 100));
    return [
        { id: "react-vite-ts", name: "React + Vite (TypeScript)"},
        { id: "python-flask-api", name: "Python Flask API"},
        { id: "express-nodejs", name: "Node.js Express App"},
    ];
};
const mockScaffoldAndPushProject = async (spaceId, projectTypeId, projectName, gitProvider, repoName, isPrivate, gitToken) => {
    console.log("MOCK SCAFFOLD:", { spaceId, projectTypeId, projectName, gitProvider, repoName, isPrivate, /* gitToken not logged */ });
    await new Promise(resolve => setTimeout(resolve, 2000));
    // Simulate backend updating the space's git_repo_url after successful scaffold
    return { success: true, message: "Project scaffolded and pushed!", repoUrl: `https://github.com/mock-user/${repoName}.git` };
};


function DevLeftPanel({ spaceId }) {
  const [devSpaceDetails, setDevSpaceDetails] = useState(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const [errorConfig, setErrorConfig] = useState(null);

  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);
  const [showSetExistingRepoModal, setShowSetExistingRepoModal] = useState(false);
  const [existingRepoUrlInput, setExistingRepoUrlInput] = useState('');
  const [isSavingRepoUrl, setIsSavingRepoUrl] = useState(false);

  const [projectTypes, setProjectTypes] = useState([]);
  const [selectedProjectType, setSelectedProjectType] = useState('');
  const [newProjectName, setNewProjectName] = useState('');
  const [gitProvider, setGitProvider] = useState('github');
  const [newRepoName, setNewRepoName] = useState('');
  const [isRepoPrivate, setIsRepoPrivate] = useState(true);
  const [gitToken, setGitToken] = useState('');
  const [isScaffolding, setIsScaffolding] = useState(false);

  const [currentAppBlueprintVersion, setCurrentAppBlueprintVersion] = useState(null);

  const loadDevSpaceConfiguration = () => {
    if (!spaceId) {
      console.warn("DevLeftPanel: loadDevSpaceConfiguration called without spaceId.");
      setIsLoadingConfig(false);
      setErrorConfig("Space ID is missing for Dev Panel.");
      setDevSpaceDetails(null);
      setCurrentAppBlueprintVersion(null);
      return;
    }
    setIsLoadingConfig(true);
    setErrorConfig(null);
    console.log(`DevLeftPanel: Initiating fetchConfig for spaceId: ${spaceId}`);
    fetchDevSpaceCoreConfig(spaceId)
      .then(details => {
        console.log("DevLeftPanel: fetchConfig THEN - Received details:", details);
        setDevSpaceDetails(details); // This will contain git_repo_url or null
        setExistingRepoUrlInput(details.git_repo_url || '');
        if (details.git_repo_url) {
          setCurrentAppBlueprintVersion(details.defaultAppBlueprintVersion || "1.0.0-alpha"); // Mock or from details
        } else {
          setCurrentAppBlueprintVersion(null);
        }
      })
      .catch(err => {
        console.error("DevLeftPanel: fetchConfig CATCH - Error:", err);
        setErrorConfig(err.message || "Failed to load Dev Space configuration.");
        setDevSpaceDetails(null);
        setCurrentAppBlueprintVersion(null);
      })
      .finally(() => {
        setIsLoadingConfig(false);
        console.log("DevLeftPanel: fetchConfig FINALLY - isLoadingConfig is now false.");
      });
  };

  useEffect(() => {
    loadDevSpaceConfiguration();
  }, [spaceId]);

  useEffect(() => {
    if (showCreateProjectModal && projectTypes.length === 0) {
      mockFetchProjectTypes().then(setProjectTypes);
    }
  }, [showCreateProjectModal, projectTypes.length]);

  const handleSetExistingRepoSubmit = async (e) => {
    e.preventDefault();
    if (!existingRepoUrlInput.trim()) {
      alert("Git repository URL cannot be empty."); return;
    }
    setIsSavingRepoUrl(true); setErrorConfig(null);
    try {
      const result = await setGitRepoUrlAPI(spaceId, existingRepoUrlInput); // API call
      if (result.success) {
        alert(result.message || 'Git repository URL updated!');
        loadDevSpaceConfiguration(); // Crucial: Re-fetch the config
      } else {
        throw new Error(result.error || "Failed to save Git URL via API.");
      }
      setShowSetExistingRepoModal(false);
    } catch (err) {
      alert("Error setting Git URL: " + err.message);
      setErrorConfig("Failed to save Git URL: " + err.message);
    } finally {
      setIsSavingRepoUrl(false);
    }
  };

  const handleCreateProjectSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProjectType || !newProjectName.trim() || !newRepoName.trim() || !gitToken.trim()) {
        alert("Please fill all required fields, including Git Token."); return;
    }
    setIsScaffolding(true); setErrorConfig(null);
    try {
        const result = await mockScaffoldAndPushProject(spaceId, selectedProjectType, newProjectName, gitProvider, newRepoName, isRepoPrivate, gitToken);
        if (result.success) {
            alert(`Project "${newProjectName}" created (mocked)! URL: ${result.repoUrl}. Reloading configuration...`);
            loadDevSpaceConfiguration(); // Re-fetch to get new git_repo_url
            setShowCreateProjectModal(false);
            setNewProjectName(''); setSelectedProjectType(''); setNewRepoName(''); setGitToken(''); setIsRepoPrivate(true);
        } else {
            alert("Failed to create project: " + (result.message || "Unknown error from scaffold"));
        }
    } catch (err) { alert("Error during project creation process: " + err.message); }
    finally { setIsScaffolding(false); }
  };

  console.log("DevLeftPanel: RENDERING - isLoadingConfig:", isLoadingConfig, "errorConfig:", errorConfig, "devSpaceDetails:", devSpaceDetails);

  if (isLoadingConfig) {
    return <div className="panel-loading-container"><LoadingSpinner /><p>Loading Code & Develop Panel...</p></div>;
  }

  if (errorConfig && (!devSpaceDetails || !devSpaceDetails.git_repo_url)) {
    return (
        <div className="dev-left-panel-split-container">
            <div className="dev-left-panel-top-half">
                 <div className="dev-left-panel-wizard">
                    <div className="panel-header"><span className="panel-title">Code</span></div>
                    <div className="wizard-content">
                        <p className="error-message">{errorConfig}</p>
                        <button className="wizard-button secondary" onClick={() => { setExistingRepoUrlInput(devSpaceDetails?.git_repo_url || ''); setShowSetExistingRepoModal(true); }}> [⚙️] 设置已有项目 </button>
                        <button className="wizard-button" onClick={loadDevSpaceConfiguration}>Retry Load</button>
                    </div>
                 </div>
            </div>
            <div className="dev-left-panel-bottom-half">
                <div className="task-area-placeholder"><p>Code configuration error. Cannot load Develop area.</p></div>
            </div>
            {/* Modals still need to be rendered if their state allows, even in error state for config */}
            {showSetExistingRepoModal && ( <Modal isOpen={showSetExistingRepoModal} onClose={() => !isSavingRepoUrl && setShowSetExistingRepoModal(false)} title="设置现有 Git 仓库" footerContent={<><button type="button" className="modal-button secondary" onClick={() => setShowSetExistingRepoModal(false)} disabled={isSavingRepoUrl}>取消</button><button type="submit" form="set-existing-repo-form" className="modal-button primary" disabled={isSavingRepoUrl}>{isSavingRepoUrl ? '保存中...' : '保存'}</button></>}> <form id="set-existing-repo-form" className="modal-form" onSubmit={handleSetExistingRepoSubmit}><div className="form-group"><label htmlFor="existingRepoUrlModalInput">Git 仓库 URL (HTTPS or SSH):</label><input type="url" id="existingRepoUrlModalInput" value={existingRepoUrlInput} onChange={(e) => setExistingRepoUrlInput(e.target.value)} required placeholder="e.g., https://github.com/username/my-repo.git" disabled={isSavingRepoUrl}/></div></form></Modal>)}
        </div>
    );
  }

  return (
    <div className="dev-left-panel-split-container">
      <div className="dev-left-panel-top-half">
        {(!devSpaceDetails || !devSpaceDetails.git_repo_url) ? (
          <div className="dev-left-panel-wizard">
             <div className="panel-header"><span className="panel-title">Code</span></div>
             <div className="wizard-content">
                <h4>你还没有关联开发项目</h4> <p>选择一个操作开始:</p>
                <button className="wizard-button primary" onClick={() => setShowCreateProjectModal(true)}>[+] 创建新项目</button>
                <p>根据向导选择项目类型、初始化代码库并推送到你的 Git 提供商。</p> <hr />
                <button className="wizard-button secondary" onClick={() => { setExistingRepoUrlInput(devSpaceDetails?.git_repo_url || ''); setShowSetExistingRepoModal(true); }}> [⚙️] 设置已有项目 </button>
                <p>如果你已经有一个 Git 仓库，请在此处配置其地址。</p>
             </div>
          </div>
        ) : (
          <FileTreeViewer 
            repoId={spaceId} 
            initialRepoUrl={devSpaceDetails.git_repo_url}
            onRepoUrlChange={loadDevSpaceConfiguration} // If FileTreeViewer updates URL itself and needs to notify parent
          />
        )}
      </div>

      <div className="dev-left-panel-bottom-half">
        {devSpaceDetails && devSpaceDetails.git_repo_url ? ( // Only show TaskArea if repo is configured
            <TaskArea
                spaceId={spaceId} 
                currentAppBlueprintVersion={currentAppBlueprintVersion}
                onAppBlueprintVersionChange={setCurrentAppBlueprintVersion}
            />
        ) : (
            <div className="task-area-placeholder">
                <p>请先在上方“Code”区域关联或创建一个 Git 仓库，以启用 Develop 功能。</p>
            </div>
        )}
      </div>

{/* Create New Project Modal */}
      {showCreateProjectModal && (
        <Modal
            isOpen={showCreateProjectModal}
            onClose={() => setShowCreateProjectModal(false)}
            title="创建新开发项目"
            footerContent={
                <>
                  <button type="button" className="modal-button secondary" onClick={() => setShowCreateProjectModal(false)}>取消</button>
                  <button type="submit" form="create-project-form" className="modal-button primary" disabled={isScaffolding}>
                      {isScaffolding ? '创建中...' : '创建并推送'}
                  </button>
                </>
            }
        >
          <form id="create-project-form" className="modal-form create-project-form" onSubmit={handleCreateProjectSubmit}>
            {/* Form fields as defined in your previous script 18/wizard */}
            <div className="form-group"><label htmlFor="newProjectName">项目名称:</label><input type="text" id="newProjectName" value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} required placeholder="e.g., my-awesome-app"/></div>
            <div className="form-group"><label htmlFor="projectType">项目类型:</label><select id="projectType" value={selectedProjectType} onChange={(e) => setSelectedProjectType(e.target.value)} required><option value="">-- 选择类型 --</option>{projectTypes.map(pt => <option key={pt.id} value={pt.id}>{pt.name}</option>)}</select></div>
            <hr/><h4>Git Repository Configuration</h4>
            <div className="form-group"><label htmlFor="gitProvider">Git 提供商:</label><select id="gitProvider" value={gitProvider} onChange={(e) => setGitProvider(e.target.value)}><option value="github">GitHub</option><option value="gitlab">GitLab</option></select></div>
            <div className="form-group"><label htmlFor="newRepoName">{gitProvider === 'github' ? 'GitHub' : 'GitLab'} 仓库名称:</label><input type="text" id="newRepoName" value={newRepoName} onChange={(e) => setNewRepoName(e.target.value)} required placeholder="e.g., new-app-repo"/></div>
            <div className="form-group checkbox-wrapper"><input type="checkbox" id="isRepoPrivate" checked={isRepoPrivate} onChange={(e) => setIsRepoPrivate(e.target.checked)} /><label htmlFor="isRepoPrivate" className="checkbox-label">创建为私有仓库</label></div>
            <div className="form-group"><label htmlFor="gitToken">{gitProvider === 'github' ? 'GitHub' : 'GitLab'} Personal Access Token (PAT):</label><input type="password" id="gitToken" value={gitToken} onChange={(e) => setGitToken(e.target.value)} required placeholder="具有 repo 创建权限的 Token"/><small>此 Token 不会永久存储，仅用于本次仓库创建和初始推送。</small></div>
          </form>
        </Modal>
      )}

      {/* Set Existing Repo Modal */}
      {showSetExistingRepoModal && (
        <Modal
            isOpen={showSetExistingRepoModal}
            onClose={() => setShowSetExistingRepoModal(false)}
            title="设置现有 Git 仓库"
            footerContent={
                <>
                  <button type="button" className="modal-button secondary" onClick={() => setShowSetExistingRepoModal(false)}>取消</button>
                  <button type="submit" form="set-existing-repo-form" className="modal-button primary" disabled={isLoadingConfig || isSavingRepoUrl}> {/* Added isSavingRepoUrl */}
                      {isSavingRepoUrl ? '保存中...' : '保存'}
                  </button>
                </>
            }
        >
            <form id="set-existing-repo-form" className="modal-form" onSubmit={handleSetExistingRepoSubmit}>
                <div className="form-group">
                    <label htmlFor="existingRepoUrlModalInput">Git 仓库 URL (HTTPS or SSH):</label>
                    <input
                        type="url"
                        id="existingRepoUrlModalInput"
                        value={existingRepoUrlInput} // Use the dedicated state for input
                        onChange={(e) => setExistingRepoUrlInput(e.target.value)}
                        required
                        placeholder="e.g., https://github.com/username/my-repo.git"
                        disabled={isSavingRepoUrl}
                    />
                </div>
            </form>
        </Modal>
      )}
    </div>




  );
}
export default DevLeftPanel;


