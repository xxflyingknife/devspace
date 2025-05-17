// frontend/src/components/FileTreeViewer.js
import React, { useState, useEffect } from 'react';
import LoadingSpinner from './LoadingSpinner';
import Modal from './Modal';
import './FileTreeViewer.css';

// TreeItem helper component (keep as is from previous version)
const TreeItem = ({ node, depth, onToggle, isExpanded, expandedFoldersState }) => {
  const isFolder = node.type === 'folder';
  const indent = depth * 20;
  let icon = isFolder ? (isExpanded ? '▼' : '▶') : '📄';
  const handleNodeClick = () => {
    if (isFolder) onToggle(node.id);
    else console.log("File clicked:", node.name);
  };
  return (
    <>
      <li className={`tree-node ${isFolder ? 'folder' : 'file'} ${isExpanded ? 'expanded' : ''}`} style={{ paddingLeft: `${indent}px` }} onClick={handleNodeClick}>
        <span className={`node-icon ${isFolder ? 'toggle-icon' : 'file-icon'}`}>{icon}</span>
        <span className="node-name" title={node.name}>{node.name}</span>
      </li>
      {isFolder && isExpanded && node.children && node.children.length > 0 && (
         node.children.map(childNode => (
          <TreeItem key={childNode.id} node={childNode} depth={depth + 1} onToggle={onToggle} isExpanded={!!expandedFoldersState[childNode.id]} expandedFoldersState={expandedFoldersState} />
        ))
      )}
    </>
  );
};


function FileTreeViewer({ repoId, initialRepoUrl }) { // Added initialRepoUrl prop
  const [treeData, setTreeData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [branches, setBranches] = useState([]); // State for real branches
  const [currentBranch, setCurrentBranch] = useState(''); // Will be set after fetching branches
  const [isLoadingBranches, setIsLoadingBranches] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [expandedFolders, setExpandedFolders] = useState({});
  const [showGitSettingsModal, setShowGitSettingsModal] = useState(false);

  const [gitRepoUrl, setGitRepoUrl] = useState(initialRepoUrl || '');
  const [tempGitRepoUrl, setTempGitRepoUrl] = useState(initialRepoUrl || '');
  const [isSavingGitSettings, setIsSavingGitSettings] = useState(false); // <--- NEW STATE for modal loading
  
  // Fetch Branches when gitRepoUrl changes and is valid
  useEffect(() => {
    if (gitRepoUrl && repoId) { // repoId also indicates a valid space context
      setIsLoadingBranches(true);
      setBranches([]); // Clear old branches
      setCurrentBranch(''); // Clear current branch
      console.log(`FILE_TREE: Fetching branches for repo: ${gitRepoUrl}`);
      fetch(`http://localhost:5001/api/dev/git/branches?repoUrl=${encodeURIComponent(gitRepoUrl)}`)
        .then(response => {
          if (!response.ok) {
            return response.json().then(err => { throw new Error(err.error || `HTTP error ${response.status}`) });
          }
          return response.json();
        })
        .then(data => {
          if (data.branches && data.branches.length > 0) {
            setBranches(data.branches);
            // Try to set to 'main', then 'master', then first branch, or keep empty if no branches
            const defaultBranch = data.branches.includes('main') ? 'main' : (data.branches.includes('master') ? 'master' : data.branches[0]);
            setCurrentBranch(defaultBranch || '');
          } else {
            setBranches([]);
            setCurrentBranch('');
            console.warn("No branches returned or empty list for", gitRepoUrl);
          }
        })
        .catch(err => {
          console.error("Error fetching branches:", err);
          setError(`Failed to fetch branches: ${err.message}`); // Show error related to branches
        })
        .finally(() => setIsLoadingBranches(false));
    } else {
      setBranches([]); // Clear branches if no repo URL
      setCurrentBranch('');
    }
  }, [gitRepoUrl, repoId]); // Depend on gitRepoUrl and repoId

  // Fetch File Tree when gitRepoUrl AND currentBranch are set and valid
  useEffect(() => {
    if (!repoId || !gitRepoUrl || !currentBranch) {
      setTreeData(null); // Clear tree if essential params are missing
      if (gitRepoUrl && !currentBranch && branches.length === 0 && !isLoadingBranches) {
          // This case means repo URL is set, branches were fetched (or attempted) but none selected or available
          setError("No branches available or selected for this repository.");
      }
      return;
    }


const fetchTreeDataFromServer = async (isRefresh = false) => { // Renamed for clarity
      setIsLoading(true); setError(null);
      if (!isRefresh) setTreeData(null); // Clear current tree only on initial load for branch, not on manual refresh
      
      console.log(`FILE_TREE: Fetching tree for spaceId: ${repoId}, branch: ${currentBranch}, refresh: ${isRefresh}`);
      try {
        let endpoint = `http://localhost:5001/api/dev/git/tree?spaceId=${encodeURIComponent(repoId)}&branch=${encodeURIComponent(currentBranch)}`;
        let options = { method: 'GET' };

        if (isRefresh) {
            endpoint = `http://localhost:5001/api/dev/git/refresh-tree`;
            options = {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ spaceId: repoId, branch: currentBranch })
            };
        }

        const response = await fetch(endpoint, options);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: response.statusText, details: "" }));
          throw new Error(errorData.error || `HTTP error ${response.status}. ${errorData.details || ""}`);
        }
        const data = await response.json();

        if (data.tree) {
            setTreeData(data.tree);
            if (data.from_cache) {
                console.log("File tree loaded from cache.");
            } else if (isRefresh) {
                alert("File tree refreshed from Git!");
            }
            // Auto-expand logic (optional)
            // ...
        } else if (data.error) {
            throw new Error(data.error);
        } else {
            setTreeData([]);
        }
      } catch (err) {
        console.error("Error fetching file tree:", err);
        setError(`路径错误或无法加载仓库文件目录 (${currentBranch}分支): ${err.message}. 请再确认您的Git仓库地址和分支。`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTreeDataFromServer(false); // Initial fetch for the branch
    // We need a way to expose fetchTreeDataFromServer for the refresh button
    // Or the refresh button calls its own API endpoint that forces a refresh on the backend.
    // The current refresh button calls the new POST endpoint.

  }, [repoId, gitRepoUrl, currentBranch]); // Keep dependencies


  const handleRefreshTree = async () => {
    if (!repoId || !gitRepoUrl || !currentBranch) {
      alert("Please configure Git Repository URL and select a branch first.");
      return;
    }
    setIsLoading(true); // Indicate loading for refresh
    setError(null);
    console.log(`FILE_TREE: Manual refresh triggered for spaceId: ${repoId}, branch: ${currentBranch}`);
    try {
      const response = await fetch(`http://localhost:5001/api/dev/git/refresh-tree`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spaceId: repoId, branch: currentBranch })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to refresh tree");
      }
      if (data.tree) {
        setTreeData(data.tree);
        // Optionally, update expandedFolders logic if needed after refresh
        alert("File tree has been refreshed!");
      } else {
        setError("Refresh completed but no tree data was returned.");
      }
    } catch (err) {
      console.error("Error refreshing file tree:", err);
      setError(`Failed to refresh file tree: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };
    















//const fetchTreeData = async () => {
//      setIsLoading(true); setError(null); setTreeData(null); setExpandedFolders({});
//      console.log(`FILE_TREE: Fetching tree for repo: ${gitRepoUrl}, branch: ${currentBranch}`);
//      try {
//        const response = await fetch(`http://localhost:5001/api/dev/git/tree?repoUrl=${encodeURIComponent(gitRepoUrl)}&branch=${encodeURIComponent(currentBranch)}`);
//        if (!response.ok) {
//          const errorData = await response.json().catch(() => ({ error: response.statusText }));
//          throw new Error(errorData.error || `HTTP error ${response.status}`);
//        }
//        const data = await response.json();
//        if (data.tree) {
//            setTreeData(data.tree);
//            // Auto-expand logic (optional)
//            const initialExpanded = {};
//            data.tree.filter(n => n.type === 'folder').slice(0,1).forEach(n => initialExpanded[n.id]=true);
//            setExpandedFolders(initialExpanded);
//        } else if (data.error) {
//            throw new Error(data.error);
//        } else {
//            setTreeData([]); // Valid response but no tree (e.g. empty repo)
//        }
//      } catch (err) {
//        console.error("Error fetching file tree:", err);
//        setError(`路径错误或无法加载仓库文件目录 (${currentBranch}分支): ${err.message}. 请再确认您的Git仓库地址和分支。`);
//      } finally {
//        setIsLoading(false);
//      }
//    };
//    fetchTreeData();
//  }, [repoId, gitRepoUrl, currentBranch]); // Re-fetch if these change


//  const [isLoading, setIsLoading] = useState(false);
//  const [error, setError] = useState(null);
//  const [currentBranch, setCurrentBranch] = useState('main');
//  const [searchTerm, setSearchTerm] = useState('');
//  const [expandedFolders, setExpandedFolders] = useState({});
//  const [showGitSettingsModal, setShowGitSettingsModal] = useState(false);

  // Use initialRepoUrl, allow it to be updated via settings modal
//  const [gitRepoUrl, setGitRepoUrl] = useState(initialRepoUrl || '');
//  const [tempGitRepoUrl, setTempGitRepoUrl] = useState(initialRepoUrl || ''); // For modal input

//  const branches = ['main', 'develop', 'feature/new-ui']; // Mock

//  useEffect(() => {
    // Update internal URL if prop changes (e.g., after wizard in DevLeftPanel sets it)
//    setGitRepoUrl(initialRepoUrl || '');
//    setTempGitRepoUrl(initialRepoUrl || '');
//  }, [initialRepoUrl]);

//  useEffect(() => {
//    console.log("FILE_TREE_VIEWER: useEffect for fetchTreeData triggered. gitRepoUrl:", gitRepoUrl, "repoId:", repoId, "branch:", currentBranch); // <-- ADD THIS

//    if (!repoId || !gitRepoUrl) { // Don't fetch if no repo URL
//        setTreeData(null); // Clear tree if URL is removed
//        return;
//    }
//    const fetchTreeData = async () => {
//      setIsLoading(true); setError(null); setTreeData(null); setExpandedFolders({});
//      console.log(`FILE_TREE: Fetching for repo: ${gitRepoUrl}, branch: ${currentBranch} (spaceId: ${repoId})`);
//      await new Promise(resolve => setTimeout(resolve, 700));
//      try { // MOCK DATA
//        const mockData = [
//          { id: 'root-backend', name: 'backend', type: 'folder', children: [{ id: 'backend-app', name: 'app', type: 'folder', children: [ { id: 'backend-app-main', name: 'main.py', type: 'file'}]}]},
//          { id: 'root-gitignore', name: '.gitignore', type: 'file' },
//        ];
//        setTreeData(mockData);
//        const initialExpanded = {}; mockData.filter(n=>n.type==='folder').slice(0,1).forEach(n => initialExpanded[n.id]=true); setExpandedFolders(initialExpanded);
//      } catch (err) {
//        console.error("Error fetching file tree:", err);
//        // More specific error message based on the problem
//        if (gitRepoUrl) { // Only show this if a URL was actually being attempted
//            setError(`路径错误或无法访问仓库。请检查 Git 仓库地址 (${gitRepoUrl}) 并确保其可访问。`);
//        } else {
//            setError("Failed to load file tree. Git repository URL might be missing.");
//        }
//    } finally {setIsLoading(false); }
//    };
//    fetchTreeData();
//  }, [repoId, gitRepoUrl, currentBranch]); // Re-fetch if repoId, actual URL, or branch changes


  const handleBranchChange = (event) => setCurrentBranch(event.target.value);
  const handleSearchChange = (event) => setSearchTerm(event.target.value);
  const toggleFolder = (folderId) => setExpandedFolders(prev => ({ ...prev, [folderId]: !prev[folderId] }));

  const handleOpenGitSettings = () => {
    setTempGitRepoUrl(gitRepoUrl); // Initialize modal with current URL
    setShowGitSettingsModal(true);
  };



  const handleSaveGitSettings = async (e) => {
    e.preventDefault();
    if (!tempGitRepoUrl.trim()) {
        alert("Git repository URL cannot be empty.");
        return;
    }
    console.log("FileTreeViewer: Attempting to save Git Repo URL:", tempGitRepoUrl, "for spaceId/repoId:", repoId);
    
    setIsSavingGitSettings(true); // <--- SET LOADING TRUE

    try {
        const response = await fetch(`http://localhost:5001/api/dev/${repoId}/git-config`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ git_repo_url: tempGitRepoUrl }),
        });
        const result = await response.json();

        setIsSavingGitSettings(false); // <--- SET LOADING FALSE (before potential errors from result)

        if (!response.ok) {
            // Error came from backend after validation or save attempt
            throw new Error(result.error || `Failed to update Git config: ${response.statusText}`);
        }

        alert(result.message || 'Git repository URL updated successfully!');
        setGitRepoUrl(tempGitRepoUrl); // Update the main URL, this will trigger tree fetch useEffect
        setShowGitSettingsModal(false); 
        // No need to manually call fetchTreeData, the useEffect depending on gitRepoUrl will handle it.

    } catch (err) {
        console.error("Error saving Git settings:", err);
        alert("Error: " + err.message); // Show error to the user
        setIsSavingGitSettings(false); // <--- ENSURE LOADING IS FALSE ON ERROR
        // Optionally, you might want to keep the modal open on error, or reset tempGitRepoUrl
    }
    // No finally needed here as we set loading to false in both success and specific error cases
  };




  const renderTreeNodes = (nodes, depth = 0) => {
    if (!nodes) return null;
    return nodes.map(node => (
      <TreeItem key={node.id} node={node} depth={depth} onToggle={toggleFolder} isExpanded={!!expandedFolders[node.id]} expandedFoldersState={expandedFolders} />
    ));
  };

  // If no gitRepoUrl is set (e.g. after clearing it in settings), this component might show minimal UI
  // But DevLeftPanel should ideally handle the "no repo configured" state.
  // This component now assumes it's only rendered when a repo IS configured.

  // Full return statement from previous script, but with the updated select:
//  return (
//    <div className="file-tree-viewer-container">
//      <div className="panel-header file-tree-panel-header">
//        <span className="panel-title"></span>
//        <div className="panel-header-actions">
//          <button className="panel-header-button" onClick={handleOpenGitSettings} title="Configure Git Repo Path">⚙️</button>
//          <button className="panel-header-button" title="Refresh Files" onClick={() => {
//              if (gitRepoUrl && currentBranch) {
//                  // Force re-fetch by temporarily changing currentBranch then reverting
//                  // This is a bit of a hack, a dedicated refresh function calling fetchTreeData is better
//                  const branchToRefresh = currentBranch;
//                  setCurrentBranch(""); // Temporarily change to trigger useEffect for tree
//                  setTimeout(() => setCurrentBranch(branchToRefresh), 0);
//              } else if (gitRepoUrl) {
//                  // If only URL is set, try to refresh branches
//                  // This would require a dedicated refreshBranches function
//                  alert("Refreshing branches (mock - implement refetch for branches)");
//              }
//          }}>🔄</button>
//        </div>
//      </div>



  return (
    <div className="file-tree-viewer-container">
      <div className="panel-header file-tree-panel-header">
        <span className="panel-title">Code</span>
        <div className="panel-header-actions">
          <button className="panel-header-button" onClick={handleOpenGitSettings} title="Configure Git Repo Path">⚙️</button>
          <button className="panel-header-button" title="Refresh Files" onClick={handleRefreshTree}>🔄</button> {/* MODIFIED onClick */}
        </div>
      </div>

           {/* === NEW COMBINED CONTROLS BAR === */}
      <div className="file-tree-controls-bar">
        <div className="branch-selector-container">
          <span className="branch-icon">[git-branch]</span>
          <select 
            value={currentBranch} 
            onChange={handleBranchChange} 
            className="branch-select" 
            disabled={!gitRepoUrl || isLoadingBranches}
          >
            {/* ... options ... */}
            {isLoadingBranches && <option value="">Loading branches...</option>}
            {!isLoadingBranches && branches.length === 0 && gitRepoUrl && <option value="">No branches</option>}
            {!isLoadingBranches && branches.length === 0 && !gitRepoUrl && <option value="">Set Repo URL</option>}
            {branches.map(branch => ( <option key={branch} value={branch}>{branch}</option> ))}
          </select>
        </div>

        <div className="search-bar-container file-tree-search"> {/* Added file-tree-search class */}
          <span className="search-icon-input">[🔍]</span>
          <input 
            type="text" 
            placeholder="Go to file" 
            value={searchTerm} 
            onChange={handleSearchChange} 
            className="search-input" 
            disabled={!gitRepoUrl || !currentBranch} 
          />
        </div>

      </div>
      {/* === END COMBINED CONTROLS BAR === */}


      <div className="file-tree-list-container">
        {!gitRepoUrl ? (
            <p className="no-repo-configured-message">Git repository not configured. Use settings (⚙️) to set URL.</p>
        ) : isLoading ? (
          <LoadingSpinner />
        ) : error ? (
          <p className="error-message">{error}</p>
        ) : treeData && treeData.length > 0 ? (
          <ul className="file-tree">{renderTreeNodes(treeData)}</ul>
        ) : treeData && treeData.length === 0 && currentBranch ? ( // Check if currentBranch is set before saying empty
            <p>No files or folders in branch '{currentBranch}'. Repository might be empty or branch is empty.</p>
        ) : (
             !currentBranch && !isLoadingBranches && branches.length > 0 ? <p>Select a branch to view files.</p> : 
             !currentBranch && !isLoadingBranches && branches.length === 0 && gitRepoUrl ? <p>No branches found for this repository.</p> :
             <p>No file data to display.</p> /* Generic fallback */
        )}
      </div>


     {showGitSettingsModal && (
        <Modal 
          isOpen={showGitSettingsModal} 
          onClose={() => !isSavingGitSettings && setShowGitSettingsModal(false)} // Prevent closing if saving
          title="Configure Git Repository"
        >
          <form onSubmit={handleSaveGitSettings} className="modal-form">
            <div className="form-group">
              <label htmlFor="gitRepoUrlFileTreeModal">Git Repository URL (HTTPS or SSH):</label>
              <input 
                type="url" 
                id="gitRepoUrlFileTreeModal" 
                value={tempGitRepoUrl} 
                onChange={(e) => setTempGitRepoUrl(e.target.value)} 
                required 
                disabled={isSavingGitSettings} // Disable input while saving
              />
            </div>
            <div className="modal-form-actions">
              <button 
                type="button" 
                className="modal-button secondary" 
                onClick={() => setShowGitSettingsModal(false)}
                disabled={isSavingGitSettings} // Disable cancel while saving
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="modal-button primary"
                disabled={isSavingGitSettings} // Disable save while saving
              >
                {isSavingGitSettings ? 'Validating & Saving...' : 'Save URL'} {/* Show loading text */}
              </button>
            </div>
            {isSavingGitSettings && ( // Optional: a small spinner or message within the modal
              <div className="modal-loading-indicator">
                <LoadingSpinner /> {/* If you have this component */}
                {/* <p>Validating URL...</p> */}
              </div>
            )}
          </form>
        </Modal>
      )}
    </div>
  );
}

export default FileTreeViewer;


