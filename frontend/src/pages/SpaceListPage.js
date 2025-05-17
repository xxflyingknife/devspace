// frontend/src/pages/SpaceListPage.js
import React, { useState, useEffect, useMemo  } from 'react';
import { Link } from 'react-router-dom';
// Header is assumed to be global in App.js
import SpaceCard from '../components/SpaceCard';
import SpaceListItem from '../components/SpaceListItem';
import Modal from '../components/Modal';
// Drawer and PluginMarketModal are assumed to be global in App.js
import LoadingSpinner from '../components/LoadingSpinner';
import './SpaceListPage.css';

// Base URL for your backend API
const API_BASE_URL = 'http://localhost:5001/api'; // Adjust if your backend runs elsewhere

// --- API Interaction Functions ---
const fetchSpacesFromAPI = async (filterType = 'all', searchTerm = '') => {
  console.log(`SpaceListPage: Fetching REAL spaces from backend. Filter: ${filterType}, Search: ${searchTerm}`);
  try {
    // Build query parameters
    const queryParams = new URLSearchParams();
    if (filterType && filterType !== 'all') {
      queryParams.append('type', filterType);
    }
    if (searchTerm) {
      queryParams.append('search', searchTerm); // Assuming backend supports search
    }
    const queryString = queryParams.toString();
    const url = `${API_BASE_URL}/spaces${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(url);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(`Backend error: ${response.status} - ${errorData.error || 'Failed to fetch spaces'}`);
    }
    const data = await response.json();
    console.log("SpaceListPage: Received spaces from backend:", data);
    return data || []; // Ensure it returns an array
  } catch (error) {
    console.error("SpaceListPage: Error in fetchSpacesFromAPI:", error);
    throw error;
  }
};

const createSpaceAPI = async (spaceData) => {
  console.log("SpaceListPage: Creating REAL space via API:", spaceData);
  try {
    const response = await fetch(`${API_BASE_URL}/spaces/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(spaceData),
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || `Failed to create space: ${response.statusText}`);
    }
    return { success: true, space: result }; // Assuming backend returns the created space object
  } catch (error) {
    console.error("SpaceListPage: Error in createSpaceAPI:", error);
    throw error;
  }
};

const updateSpaceTitleAPI = async (spaceId, newTitle) => {
  console.log("SpaceListPage: Updating REAL space title via API for:", spaceId, "to:", newTitle);
  try {
    const response = await fetch(`${API_BASE_URL}/spaces/${spaceId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newTitle }), // Only sending name for title update
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || `Failed to update title: ${response.statusText}`);
    }
    return { success: true, space: result }; // Assuming backend returns the updated space
  } catch (error) {
    console.error("SpaceListPage: Error in updateSpaceTitleAPI:", error);
    throw error;
  }
};

const deleteSpaceAPI = async (spaceId) => {
  console.log("SpaceListPage: Deleting REAL space via API:", spaceId);
  try {
    const response = await fetch(`${API_BASE_URL}/spaces/${spaceId}`, {
      method: 'DELETE',
    });
    const result = await response.json(); // Even for DELETE, backend might send a confirmation
    if (!response.ok) {
      throw new Error(result.error || `Failed to delete space: ${response.statusText}`);
    }
    return { success: true, message: result.message || "Space deleted successfully." };
  } catch (error) {
    console.error("SpaceListPage: Error in deleteSpaceAPI:", error);
    throw error;
  }
};


function SpaceListPage() {
  const [spaces, setSpaces] = useState([]);
  // filteredSpaces is now derived in useMemo or directly in render
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [viewMode, setViewMode] = useState('grid');
  const [filterType, setFilterType] = useState('all');
  const [_searchTerm, _setSearchTerm] = useState(''); // Keep if search will be added

  const [showNewSpaceModal, setShowNewSpaceModal] = useState(false);
  const [showEditSpaceModal, setShowEditSpaceModal] = useState(false);
  const [editingSpace, setEditingSpace] = useState(null);

  const [newSpaceName, setNewSpaceName] = useState('');
  const [newSpaceType, setNewSpaceType] = useState('dev');
  const [newSpaceDescription, setNewSpaceDescription] = useState('');

  // Theme and global drawers managed by App.js

  // Centralized function to fetch and set spaces
  const loadSpaces = (currentFilterType = filterType) => {
    setIsLoading(true);
    setError(null);
    fetchSpacesFromAPI(currentFilterType /*, searchTerm */) // Pass current filters
      .then(data => {
        setSpaces(data);
      })
      .catch(err => {
        console.error("Error loading spaces:", err);
        setError(err.message || "无法加载空间列表");
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadSpaces('all'); // Initial load with 'all' filter
  }, []); // Empty dependency array means run once on mount

  // This useEffect handles re-filtering when 'spaces' or 'filterType' changes
  const filteredSpaces = useMemo(() => {
    let currentSpaces = [...spaces];
    if (filterType !== 'all') {
      currentSpaces = currentSpaces.filter(space => space.type === filterType);
    }
    // Add searchTerm filter here if you implement it
    // if (searchTerm) { ... }
    return currentSpaces;
  }, [spaces, filterType /*, searchTerm */]);


  const handleCreateNewSpace = async (e) => {
    e.preventDefault();
    if (!newSpaceName.trim()) {
      alert("空间名称不能为空"); return;
    }
    const spaceData = { name: newSpaceName, type: newSpaceType, description: newSpaceDescription };
    try {
      const result = await createSpaceAPI(spaceData);
      if (result.success && result.space) {
        // Add to local state, or better, refetch the entire list to ensure consistency
        // setSpaces(prev => [result.space, ...prev]); // Optimistic update
        loadSpaces(filterType); // Re-fetch to get the latest list including the new one
        setShowNewSpaceModal(false);
        setNewSpaceName(''); setNewSpaceType('dev'); setNewSpaceDescription('');
      } else {
        alert("创建空间失败: " + (result.error || "未知错误"));
      }
    } catch (err) {
      alert("创建空间时出错: " + (err.message || "未知错误"));
    }
  };

  const handleDeleteSpace = async (spaceId, spaceName) => {
    if (window.confirm(`确定要删除空间 "${spaceName}" 吗？此操作无法撤销。`)) {
      try {
        const result = await deleteSpaceAPI(spaceId);
        if (result.success) {
            // setSpaces(prev => prev.filter(s => s.id !== spaceId)); // Optimistic
            loadSpaces(filterType); // Re-fetch
        } else {
            alert("删除空间失败: " + (result.error || "未知错误"));
        }
      } catch (err) {
        alert("删除空间时出错: " + (err.message || "未知错误"));
      }
    }
  };

  const openEditModal = (spaceId, currentName) => {
    setEditingSpace({ id: spaceId, name: currentName });
    setNewSpaceName(currentName);
    setShowEditSpaceModal(true);
  };

  const handleEditSpaceTitle = async (e) => {
    e.preventDefault();
    if (!editingSpace || !newSpaceName.trim()) return;
    try {
      const result = await updateSpaceTitleAPI(editingSpace.id, newSpaceName);
      if (result.success && result.space) {
          // setSpaces(prev => prev.map(s => s.id === editingSpace.id ? { ...s, name: newSpaceName } : s)); // Optimistic
          loadSpaces(filterType); // Re-fetch
          setShowEditSpaceModal(false);
          setEditingSpace(null);
          setNewSpaceName('');
      } else {
          alert("修改标题失败: " + (result.error || "未知错误"));
      }
    } catch (err) {
      alert("修改标题时出错: " + (err.message || "未知错误"));
    }
  };

  // Handler for filter dropdown change
  const handleFilterChange = (e) => {
    const newFilterType = e.target.value;
    setFilterType(newFilterType);
    // The useEffect for filteredSpaces will automatically update the displayed list
    // OR, if backend handles filtering:
    // loadSpaces(newFilterType, searchTerm);
  };


  if (isLoading && spaces.length === 0) return (
    <main className="space-list-main-content only-loader">
        <div className="loading-fullpage"><LoadingSpinner /> 加载中...</div>
    </main>
  );
  if (error) return (
    <main className="space-list-main-content only-loader">
        <div className="error-fullpage">{error} <button onClick={() => loadSpaces('all')}>重试</button></div>
    </main>
  );

  return (
    <main className="space-list-main-content">
      <div className="welcome-header">
        <h1>欢迎使用 Space+</h1>
        <h4>This is a Ideless&Vibe DevOps Platform</h4>
      </div>
      <div className="space-list-controls-header">
         <button className="new-space-button" onClick={() => setShowNewSpaceModal(true)}>+ 新建</button>
         <div className="view-controls">
             <button className={`control-button ${viewMode === 'grid' ? 'active' : ''}`} onClick={() => setViewMode('grid')} aria-label="Grid view">▦</button>
             <button className={`control-button ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')} aria-label="List view">≡</button>
         </div>
         <select className="filter-dropdown" value={filterType} onChange={handleFilterChange} aria-label="Filter spaces by type">
             <option value="all">所有空间</option>
             <option value="dev">Dev 空间</option>
             <option value="ops">Ops 空间</option>
         </select>
      </div>

      {isLoading && spaces.length > 0 && <div className="loading-inline"><LoadingSpinner /> 更新列表中...</div>}

      {viewMode === 'grid' ? (
        <div className="space-grid">
          {filteredSpaces.map(space => (
            <SpaceCard key={space.id} {...space} onDelete={handleDeleteSpace} onEditTitle={openEditModal} />
          ))}
        </div>
      ) : (
        <ul className="space-list-view">
          {filteredSpaces.map(space => (
            <SpaceListItem key={space.id} {...space} onDelete={handleDeleteSpace} onEditTitle={openEditModal} />
          ))}
        </ul>
      )}
      {!isLoading && filteredSpaces.length === 0 && (
          <p className="no-spaces-message">没有找到符合条件的空间。请尝试其他筛选条件或新建一个空间。</p>
      )}

      {/* New Space Modal */}
      <Modal
        isOpen={showNewSpaceModal}
        onClose={() => setShowNewSpaceModal(false)}
        title="新建空间" // <-- IS THIS PROP PRESENT AND CORRECT?
        footerContent={ // <-- IS THIS PROP PRESENT AND CORRECTLY STRUCTURED?
          <>
            <button type="button" className="modal-button secondary" onClick={() => setShowNewSpaceModal(false)}>取消</button>
            <button type="submit" form="new-space-form" className="modal-button primary">创建</button>
          </>
        }
      >
        <form id="new-space-form" className="modal-form" onSubmit={handleCreateNewSpace}>
        
          <div className="form-group">
            <label htmlFor="newSpaceName">空间名称</label>
            <input
              type="text"
              id="newSpaceName"
              value={newSpaceName}
              onChange={(e) => setNewSpaceName(e.target.value)}
              required
              placeholder="例如：我的项目 A"
            />
          </div>
          <div className="form-group">
            <label htmlFor="newSpaceType">空间类型</label>
            <select 
              id="newSpaceType" 
              value={newSpaceType} 
              onChange={(e) => setNewSpaceType(e.target.value)}
            >
              <option value="dev">Dev (开发)</option>
              <option value="ops">Ops (运维)</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="newSpaceDescription">空间说明 (可选)</label>
            <textarea
              id="newSpaceDescription"
              value={newSpaceDescription}
              onChange={(e) => setNewSpaceDescription(e.target.value)}
              rows="3"
              placeholder="简要描述这个空间的用途..."
            />
          </div>
</form>
      </Modal>

      {/* Edit Space Title Modal */}
      {editingSpace && (<Modal isOpen={showEditSpaceModal} /* ... same as before ... */ >
            <form id="edit-space-form" className="modal-form" onSubmit={handleEditSpaceTitle}>
                <div className="form-group">
                    <label htmlFor="editSpaceName">新空间名称</label>
                    <input type="text" id="editSpaceName" value={newSpaceName} onChange={(e) => setNewSpaceName(e.target.value)} required />
                </div>
                 {/* Footer buttons are passed as prop to Modal */}
            </form>
        </Modal>
      )}
      {/* Global Drawers and PluginMarketModal are handled by App.js */}
    </main>
  );
}

export default SpaceListPage;
