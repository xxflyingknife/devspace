// frontend/src/components/PluginMarketModal.js
import React, { useState, useEffect, useMemo } from 'react';
import Modal from './Modal';
import LoadingSpinner from './LoadingSpinner';
import { marketPlugins as staticMarketPlugins } from '../config/toolConfigs'; // Fallback
import './PluginMarketModal.css';

const API_BASE_URL = 'http://localhost:5001/api';

// Fetches ALL available plugins from the market
const fetchAllAvailablePluginsAPI = async () => {
    console.log("PluginMarket: Fetching ALL available plugins from backend");
    try {
        const response = await fetch(`${API_BASE_URL}/plugins/`);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: response.statusText }));
            throw new Error(`Backend error: ${response.status} - ${errorData.error || 'Failed to fetch available plugins'}`);
        }
        const data = await response.json();
        console.log("PluginMarket: Received available plugins:", data);
        return data && data.length > 0 ? data : staticMarketPlugins;
    } catch (error) {
        console.error("PluginMarket: Error in fetchAllAvailablePluginsAPI:", error);
        return staticMarketPlugins; // Fallback
    }
};

// Fetches plugins INSTALLED for the CURRENT USER (backend uses mock user ID for now)
const fetchCurrentUserInstalledPluginsAPI = async () => {
    // This endpoint in the backend currently uses get_current_user_id_mock()
    // So, spaceId in the URL is just a placeholder for now for that backend route.
    // In a real auth system, this endpoint might be /api/user/plugins/installed
    const mockSpaceIdForUserPlugins = 'user_context'; // Or pass actual currentSpaceId if backend uses it
    console.log(`PluginMarket: Fetching INSTALLED plugins for current user (via space context: ${mockSpaceIdForUserPlugins})`);
    try {
        const response = await fetch(`${API_BASE_URL}/plugins/installed`);
        if (!response.ok) {
            console.error(`Error fetching installed plugins for user: ${response.statusText}`);
            return []; // Return empty on error, don't break the UI
        }
        const data = await response.json();
        console.log(`PluginMarket: Received installed plugins for user:`, data);
        return data || [];
    } catch (error) {
        console.error("PluginMarket: Error in fetchCurrentUserInstalledPluginsAPI:", error);
        return [];
    }
};


const PluginCard = ({ plugin, onInstallClick, onUninstall, onConfigure, processingPluginId }) => {
    const isBeingProcessed = processingPluginId === plugin.id;
    return (
        <div className="plugin-card">
            <div className="plugin-card-content-wrapper">
                <div className="plugin-card-header">
                    <div className="plugin-card-icon">{plugin.icon || plugin.icon_url_or_emoji || '🧩'}</div>
                    <div className="plugin-card-title-area">
                        <h3>{plugin.name}</h3>
                        <span className="plugin-version">v{plugin.version}</span>
                    </div>
                </div>
                <p className="plugin-category-display">
                    {plugin.subCategory || (plugin.targetSpaceType === 'dev' ? 'Dev Specific' : (plugin.targetSpaceType === 'ops' ? 'Ops Specific' : 'General'))}
                </p>
                <p className="plugin-description">{plugin.description}</p>
            </div>
            <p className="plugin-author">By: {plugin.author}</p>
            <div className="plugin-card-actions">
                {plugin.installed ? (
                    <>
                        <button onClick={() => onConfigure(plugin.id)} className="plugin-button configure" disabled={isBeingProcessed}>
                            {isBeingProcessed ? '...' : 'Configure'}
                        </button>
                        <button onClick={() => onUninstall(plugin.id)} className="plugin-button uninstall" disabled={isBeingProcessed}>
                            {isBeingProcessed ? '...' : 'Uninstalling...'}
                        </button>
                    </>
                ) : (
                    <button onClick={() => onInstallClick(plugin.id, plugin.name)} className="plugin-button install" disabled={isBeingProcessed}>
                        {isBeingProcessed ? '...' : 'Install'}
                    </button>
                )}
            </div>
        </div>
    );
};


function PluginMarketModal({ isOpen, onClose, currentSpaceId, allUserSpaces = [] }) {
    const [allAvailablePlugins, setAllAvailablePlugins] = useState([]);
    const [currentUserInstalledPluginIds, setCurrentUserInstalledPluginIds] = useState(new Set());
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [processingPluginId, setProcessingPluginId] = useState(null);

    const [showSelectSpaceModal, setShowSelectSpaceModal] = useState(false);
    const [pluginToInstallForSpecificSpace, setPluginToInstallForSpecificSpace] = useState(null);
    const [targetSpaceForInstall, setTargetSpaceForInstall] = useState('');

    const mainPluginCategories = [
        { key: 'all', label: '所有插件' },
        { key: '平台功能插件', label: '平台功能插件' },
        { key: 'AI 智能插件', label: 'AI 智能插件' }
    ];
    const [selectedMainCategory, setSelectedMainCategory] = useState('all');

    const spaceTypeFilters = [
        { key: 'all', label: '适用所有空间' },
        { key: 'dev', label: 'DEV 空间' },
        { key: 'ops', label: 'OPS 空间' }
    ];
    const [selectedSpaceTypeFilter, setSelectedSpaceTypeFilter] = useState('all');

    const loadPluginData = async () => {
        if (!isOpen) return;
        setIsLoading(true); setError(null);
        try {
            const [available, installedForUser] = await Promise.all([
                fetchAllAvailablePluginsAPI(),
                fetchCurrentUserInstalledPluginsAPI() // Fetches for the current (mocked) user
            ]);
            setAllAvailablePlugins(available);
            const installedIds = new Set(installedForUser.map(p => p.plugin_id));
            setCurrentUserInstalledPluginIds(installedIds);
        } catch (err) {
            console.error("Error fetching plugin data:", err);
            setError("Failed to load plugin information.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            setSelectedMainCategory('all'); setSelectedSpaceTypeFilter('all'); setSearchTerm('');
            loadPluginData();
        }
    }, [isOpen]); // Only reload all data when modal is opened


    const pluginsToDisplay = useMemo(() => {
        return allAvailablePlugins.map(p => ({
            ...p,
            installed: currentUserInstalledPluginIds.has(p.id) // Installed for the current user
        })).filter(plugin => {
            const mainCatMatch = selectedMainCategory === 'all' || plugin.category === selectedMainCategory;
            const typeMatch = selectedSpaceTypeFilter === 'all' ||
                              plugin.targetSpaceType === selectedSpaceTypeFilter ||
                              plugin.targetSpaceType === 'all' || !plugin.targetSpaceType;
            const searchMatch = searchTerm === '' ||
                                (plugin.name && plugin.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
                                (plugin.description && plugin.description.toLowerCase().includes(searchTerm.toLowerCase()));
            return mainCatMatch && typeMatch && searchMatch;
        });
    }, [allAvailablePlugins, currentUserInstalledPluginIds, selectedMainCategory, selectedSpaceTypeFilter, searchTerm]);

    const performUserInstall = async (pluginId, pluginName) => {
        setProcessingPluginId(pluginId);
        try {
            // Calls the USER-CENTRIC install API
            const response = await fetch(`${API_BASE_URL}/plugins/${pluginId}/install`, {
                method: 'POST',
                // headers: { 'Content-Type': 'application/json', 'X-User-ID': '1' }, // Send mock user ID if needed by backend
                // body: JSON.stringify({ user_specific_config: {} }), // Optional initial global config for user
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "Failed to install plugin for user");
            alert(result.message || `Plugin '${pluginName || pluginId}' installed successfully for your account!`);
            loadPluginData(); // Refresh lists to show new installed state
        } catch (err) {
            alert(`Error installing plugin: ${err.message}`);
        } finally {
            setProcessingPluginId(null);
            setShowSelectSpaceModal(false);
            setPluginToInstallForSpecificSpace(null);
        }
    };

    const handleInstallClick = (pluginId, pluginName) => {
        // With user-centric plugins, we always call performUserInstall.
        // The concept of "installing into a space" might change to "enabling in a space" or
        // "configuring for a space" if the plugin is already installed by the user.
        // For now, "Install" means install for the current user.
        performUserInstall(pluginId, pluginName);

        // The "select space" modal logic might be repurposed if a plugin, once user-installed,
        // then needs to be specifically activated or configured for a particular space.
        // That's a more advanced step. For now, let's simplify: install is user-level.
    };

    const handleUninstall = async (pluginId) => {
        const pluginToUninstall = allAvailablePlugins.find(p => p.id === pluginId);
        if (!window.confirm(`Are you sure you want to uninstall plugin '${pluginToUninstall?.name || pluginId}' from your account? It will be removed from all your spaces.`)) {
            return;
        }
        setProcessingPluginId(pluginId);
        try {
            // Calls the USER-CENTRIC uninstall API
            const response = await fetch(`${API_BASE_URL}/plugins/${pluginId}/uninstall`, {
                method: 'DELETE',
                // headers: { 'X-User-ID': '1' }, // Send mock user ID if needed
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "Failed to uninstall plugin");
            alert(result.message || "Plugin uninstalled successfully from your account!");
            loadPluginData();
        } catch (err) {
            alert(`Error uninstalling plugin: ${err.message}`);
        } finally {
            setProcessingPluginId(null);
        }
    };

    const handleConfigure = (pluginId) => {
        alert(`Configure plugin: ${pluginId} for current user - (User-specific global config UI Not Implemented Yet)`);
        // TODO: Fetch user's global config for this plugin using GET /api/plugins/:pluginId/config
        // Open a modal with a form based on plugin.defaultConfigSchema
        // On save, PUT to /api/plugins/:pluginId/config
    };

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} title="插件市场 (Plugin Market)" modalClassName="plugin-market-modal-content wide-v2">
                <div className="plugin-market-layout">
                    <div className="plugin-market-sidebar">
                        <ul className="vertical-tabs">
                            {mainPluginCategories.map(cat => (
                                <li key={cat.key}>
                                    <button
                                        className={`vertical-tab-button ${selectedMainCategory === cat.key ? 'active' : ''}`}
                                        onClick={() => { setSelectedMainCategory(cat.key); setSelectedSpaceTypeFilter('all'); }}
                                    >
                                        {cat.label}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="plugin-market-main-content">
                        <div className="plugin-market-toolbar">
                            <input
                                type="text"
                                placeholder="在当前分类下搜索插件..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="plugin-search-input"
                            />
                             <div className="plugin-space-type-filter-bar">
                                {spaceTypeFilters.map(filter => (
                                    <button
                                        key={filter.key}
                                        className={`space-type-tab ${selectedSpaceTypeFilter === filter.key ? 'active' : ''}`}
                                        onClick={() => setSelectedSpaceTypeFilter(filter.key)}
                                    >
                                        {filter.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="plugin-market-body-content">
                            {isLoading && <div className="plugin-market-loading"><LoadingSpinner /> <p>Loading Plugins...</p></div>}
                            {error && <p className="error-message">{error} <button onClick={loadPluginData}>Retry</button></p>}
                            {!isLoading && !error && (
                                <div className="plugin-grid">
                                    {pluginsToDisplay.length > 0 ? (
                                        pluginsToDisplay.map(plugin => (
                                            <PluginCard
                                                key={plugin.id}
                                                plugin={plugin}
                                                onInstallClick={handleInstallClick}
                                                onUninstall={handleUninstall}
                                                onConfigure={handleConfigure}
                                                processingPluginId={processingPluginId}
                                                currentSpaceId={currentSpaceId} // Still pass for context if card needs it
                                            />
                                        ))
                                    ) : ( <p className="no-plugins-found">没有找到匹配的插件。</p> )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </Modal>

            {/* The "Select Space to Install" modal is now removed as install is user-centric */}
            {/* If you later add per-space *activation* or *configuration* of an already user-installed plugin,
                that would be a different modal/UI flow, likely triggered from within a space context. */}
        </>
    );
}

export default PluginMarketModal;


