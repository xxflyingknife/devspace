// frontend/src/components/SpaceSettingsModal.js
import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import Accordion from './Accordion'; // Still useful within tabs for grouping
import LoadingSpinner from './LoadingSpinner';
import './SpaceSettingsModal.css';

// Mock function to fetch current settings - replace with API call
const mockFetchSpaceSettings = async (spaceId, spaceType) => {
    console.log(`SETTINGS_MODAL: Fetching settings for space ${spaceId} (type: ${spaceType})`);
    await new Promise(resolve => setTimeout(resolve, 300));
    // This should return ALL settings, including basic and agent-specific
    return {
        // Basic Settings (from before)
        llmSource: 'gemini', geminiApiKeyStatus: 'set', chatGptApiKeyStatus: 'not_set', otherLlmEndpoint: '',
        agentTypeGlobal: 'default_dev_agent', // Renamed for clarity, might be different from space-specific agent settings
        mcpServerUrl: 'https://my-ci-cd.example.com', mcpApiKeyStatus: 'set',
        debugVCIService: 'docker', debugVCIEndpoint: 'unix:///var/run/docker.sock', debugVCICredsStatus: 'not_set',
        k8sTestContext: 'test-cluster', k8sStagingContext: 'staging-cluster', k8sProdContext: 'prod-cluster',
        codeStorageProvider: 'github', codeStorageApiTokenStatus: 'set',
        // Agent Settings (New)
        agentName: `${spaceType}_agent_for_${spaceId}`,
        defaultBlueprintVersion: '1.0.0-alpha',
        blueprintUpdateStrategy: 'manual_confirm', // 'auto_minor', 'manual_confirm'
        enabledTools: spaceType === 'dev' ? ['git_push_tool', 'deploy_to_alpha_tool'] : ['get_pod_logs_tool', 'restart_deployment_tool'],
        toolConfigs: { // Example: space-specific overrides for tool params
            'git_push_tool': { defaultBranch: 'main', allowForce: false },
            'get_pod_logs_tool': { defaultNamespace: 'production' }
        },
        agentMemoryDepth: 10, // Number of past messages to consider
        agentSafetyLevel: 'high', // 'high', 'medium', 'low'
    };
};

// Mock function to save settings - replace with API call
const mockSaveSpaceSettings = async (spaceId, settingsToSave) => {
    console.log(`SETTINGS_MODAL: Saving settings for space ${spaceId}:`, settingsToSave);
    await new Promise(resolve => setTimeout(resolve, 700));
    return { success: true, message: "Space settings updated successfully!" };
};


function SpaceSettingsModal({ isOpen, onClose, spaceId, spaceType }) {
    const [activeTab, setActiveTab] = useState('basic'); // 'basic' or 'agent'
    const [settings, setSettings] = useState({
        // Basic Settings - Initialize with typical defaults or empty
        llmSource: 'gemini', geminiApiKey: '', chatGptApiKey: '', otherLlmEndpoint: '',
        agentTypeGlobal: 'default', mcpServerUrl: '', mcpServerApiKey: '',
        debugVCIService: 'docker', debugVCIEndpoint: '', debugVCICreds: '',
        k8sTestContext: '', k8sStagingContext: '', k8sProdContext: '',
        codeStorageProvider: 'github', codeStorageApiToken: '',
        // Agent Settings - Initialize
        agentName: '', defaultBlueprintVersion: '', blueprintUpdateStrategy: 'manual_confirm',
        enabledTools: [], toolConfigs: {}, agentMemoryDepth: 10, agentSafetyLevel: 'high',
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isOpen && spaceId) {
            setIsLoading(true); setError(null);
            mockFetchSpaceSettings(spaceId, spaceType)
                .then(data => {
                    // Set all fields from fetched data, ensuring not to overwrite API keys being typed
                    setSettings(prev => ({
                        ...prev, // Keep currently typed API keys unless explicitly cleared/changed
                        ...data, // Fetched data will override defaults
                        // Ensure API keys are not prefilled from status fields like 'geminiApiKeyStatus'
                        geminiApiKey: prev.geminiApiKey || '', // Keep what user typed or empty
                        chatGptApiKey: prev.chatGptApiKey || '',
                        mcpServerApiKey: prev.mcpServerApiKey || '',
                        debugVCICreds: prev.debugVCICreds || '',
                        codeStorageApiToken: prev.codeStorageApiToken || '',
                    }));
                })
                .catch(err => { console.error(err); setError("Failed to load current space settings."); })
                .finally(() => setIsLoading(false));
        } else if (!isOpen) {
            // Optionally reset form when modal closes to avoid stale data on reopen
            // setSettings({ ...initial default settings ... });
        }
    }, [isOpen, spaceId, spaceType]);

    const handleChange = (e, section = null) => {
        const { name, value, type, checked } = e.target;
        const val = type === 'checkbox' ? checked : value;

        if (section === 'toolConfigs') {
            // Example for nested toolConfigs: name might be "git_push_tool.defaultBranch"
            const [toolId, configKey] = name.split('.');
            setSettings(prev => ({
                ...prev,
                toolConfigs: {
                    ...prev.toolConfigs,
                    [toolId]: {
                        ...(prev.toolConfigs ? prev.toolConfigs[toolId] : {}),
                        [configKey]: val
                    }
                }
            }));
        } else {
            setSettings(prev => ({ ...prev, [name]: val }));
        }
    };
    
    const handleEnabledToolChange = (toolId, isEnabled) => {
        setSettings(prev => {
            const currentTools = prev.enabledTools || [];
            if (isEnabled) {
                return { ...prev, enabledTools: [...new Set([...currentTools, toolId])] };
            } else {
                return { ...prev, enabledTools: currentTools.filter(id => id !== toolId) };
            }
        });
    };


    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true); setError(null);
        
        const payloadToSave = { ...settings };
        // Sanitize API key fields: only send if they have new values (not just placeholders for status)
        if (!payloadToSave.geminiApiKey) delete payloadToSave.geminiApiKey;
        if (!payloadToSave.chatGptApiKey) delete payloadToSave.chatGptApiKey;
        // ... similar for other API key fields ...

        try {
            const result = await mockSaveSpaceSettings(spaceId, payloadToSave);
            if (result.success) {
                alert(result.message);
                onClose();
            } else {
                throw new Error(result.error || "Failed to save settings.");
            }
        } catch (err) { console.error(err); setError(err.message); }
        finally { setIsLoading(false); }
    };

    // Mock available tools for the "Agent Settings" section
    const MOCK_AVAILABLE_TOOLS_FOR_AGENT = spaceType === 'dev'
        ? [{id: 'git_push_tool', name: 'Git Push'}, {id: 'deploy_to_alpha_tool', name: 'Deploy to Alpha'}, {id: 'k8s_apply_yaml_tool', name: 'Apply K8s YAML'}]
        : [{id: 'get_pod_logs_tool', name: 'Get Pod Logs'}, {id: 'restart_deployment_tool', name: 'Restart Deployment'}, {id: 'aiops_anomaly_skill', name: 'AIOps Anomaly Detection'}];


    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`空间设置 (${spaceType === 'dev' ? 'Dev' : 'Ops'})`} modalClassName="space-settings-modal extra-wide">
            {isLoading && !error && <div className="modal-loading-overlay"><LoadingSpinner /> <p>加载设置...</p></div>}
            {error && <p className="error-message modal-error">{error} <button onClick={() => { /* Retry logic */ }}>Retry</button></p>}
            
            <div className="space-settings-layout">
                <div className="space-settings-sidebar">
                    <button className={`settings-tab-button ${activeTab === 'basic' ? 'active' : ''}`} onClick={() => setActiveTab('basic')}>基本设置</button>
                    <button className={`settings-tab-button ${activeTab === 'agent' ? 'active' : ''}`} onClick={() => setActiveTab('agent')}>智能体设置</button>
                </div>
                <form onSubmit={handleSubmit} className="space-settings-form">
                <div className="space-settings-main-content">
                        {activeTab === 'basic' && (
                            <div className="settings-tab-content">
                                <Accordion title="LLM & Global Agent Configuration" initialOpen={true}>
                                    {/* ... LLM Source, API Key fields, Global Agent Type as in ChatToolbar settings modal ... */}
                                    <div className="form-group"><label>LLM Source:</label><select name="llmSource" value={settings.llmSource} onChange={handleChange}><option value="gemini">Gemini</option><option value="chatgpt">ChatGPT</option><option value="other">Other</option></select></div>
                                    {settings.llmSource === 'gemini' && <div className="form-group"><label>Gemini API Key:</label><input type="password" name="geminiApiKey" value={settings.geminiApiKey} onChange={handleChange} placeholder="Leave blank to keep existing"/></div>}
                                    {/* ... other LLM fields ... */}
                                </Accordion>
                                <Accordion title="Debug Environment (VCI)" initialOpen={spaceType==='dev'}>
                                    {/* ... Debug VCI fields as in ChatToolbar settings modal ... */}
                                     <div className="form-group"><label>VCI Provider:</label><select name="debugVCIService" value={settings.debugVCIService} onChange={handleChange}><option value="docker">Local Docker</option><option value="aws_fargate">AWS Fargate</option></select></div>
                                     <div className="form-group"><label>Endpoint/Config:</label><input type="text" name="debugVCIEndpoint" value={settings.debugVCIEndpoint} onChange={handleChange}/></div>
                                </Accordion>
                                <Accordion title="K8s Deployment Environments" initialOpen={spaceType==='dev'}>
                                    {/* ... K8s Context fields as in ChatToolbar settings modal ... */}
                                    <div className="form-group"><label>Test Env K8s Context:</label><input type="text" name="k8sTestContext" value={settings.k8sTestContext} onChange={handleChange}/></div>
                                    {/* ... staging, prod ... */}
                                </Accordion>
                                <Accordion title="Remote Code Storage (if applicable)" initialOpen={spaceType==='dev'}>
                                    {/* ... Code Storage fields as in ChatToolbar settings modal ... */}
                                    <div className="form-group"><label>Provider:</label><select name="codeStorageProvider" value={settings.codeStorageProvider} onChange={handleChange}><option value="github">GitHub</option></select></div>
                                    <div className="form-group"><label>API Token/PAT:</label><input type="password" name="codeStorageApiToken" value={settings.codeStorageApiToken} onChange={handleChange} placeholder="Leave blank to keep existing"/></div>
                                </Accordion>
                                <Accordion title="MCP Server (Optional)" initialOpen={false}>
                                    {/* ... MCP fields as in ChatToolbar settings modal ... */}
                                    <div className="form-group"><label>MCP URL:</label><input type="url" name="mcpServerUrl" value={settings.mcpServerUrl} onChange={handleChange}/></div>
                                </Accordion>
                            </div>
                        )}
                        {activeTab === 'agent' && (
                            <div className="settings-tab-content">
                                <Accordion title="Agent Core" initialOpen={true}>
                                    <div className="form-group"><label htmlFor="agentName">智能体名称 (内部标识):</label><input type="text" id="agentName" name="agentName" value={settings.agentName} onChange={handleChange} /></div>
                                    <div className="form-group"><label htmlFor="agentMemoryDepth">对话记忆深度 (轮次):</label><input type="number" id="agentMemoryDepth" name="agentMemoryDepth" value={settings.agentMemoryDepth} onChange={handleChange} min="0" max="50"/></div>
                                    <div className="form-group"><label htmlFor="agentSafetyLevel">安全/防护等级:</label><select id="agentSafetyLevel" name="agentSafetyLevel" value={settings.agentSafetyLevel} onChange={handleChange}><option value="high">High</option><option value="medium">Medium</option><option value="low">Low (Use with caution)</option></select></div>
                                </Accordion>
                                <Accordion title="Application Blueprint (APP-BP) Handling" initialOpen={true}>
                                    <div className="form-group"><label htmlFor="defaultBlueprintVersion">默认使用蓝图版本:</label><input type="text" id="defaultBlueprintVersion" name="defaultBlueprintVersion" value={settings.defaultBlueprintVersion} onChange={handleChange} placeholder="e.g., latest, 1.0.2"/></div>
                                    <div className="form-group"><label htmlFor="blueprintUpdateStrategy">蓝图更新策略:</label><select id="blueprintUpdateStrategy" name="blueprintUpdateStrategy" value={settings.blueprintUpdateStrategy} onChange={handleChange}><option value="manual_confirm">手动确认所有变更</option><option value="auto_minor">自动应用小幅优化</option></select></div>
                                </Accordion>
                                <Accordion title="Enabled Tools & Configuration" initialOpen={true}>
                                    <p>选择此空间智能体可使用的工具：</p>
                                    <div className="tools-enable-list">
                                        {MOCK_AVAILABLE_TOOLS_FOR_AGENT.map(tool => (
                                            <div key={tool.id} className="form-group checkbox-wrapper tool-enable-item">
                                                <input type="checkbox" id={`tool-enable-${tool.id}`} checked={(settings.enabledTools || []).includes(tool.id)} onChange={(e) => handleEnabledToolChange(tool.id, e.target.checked)} />
                                                <label htmlFor={`tool-enable-${tool.id}`} className="checkbox-label">{tool.name}</label>
                                            </div>
                                        ))}
                                    </div>
                                    {/* TODO: Add inputs for specific toolConfigs based on enabledTools and their schemas */}
                                    {(settings.enabledTools || []).includes('git_push_tool') && settings.toolConfigs?.git_push_tool && (
                                        <fieldset className="tool-config-fieldset">
                                            <legend>Git Push Tool Config</legend>
                                            <div className="form-group">
                                                <label htmlFor="git_push_tool.defaultBranch">Default Branch:</label>
                                                <input type="text" id="git_push_tool.defaultBranch" name="git_push_tool.defaultBranch" value={settings.toolConfigs.git_push_tool.defaultBranch || ''} onChange={(e) => handleChange(e, 'toolConfigs')} />
                                            </div>
                                            {/* Add more config fields for this tool */}
                                        </fieldset>
                                    )}
                                </Accordion>
                            </div>
                        )}
                    </div>
                        {!isLoading && !error && (
                             <div className="settings-save-footer modal-form-actions">
                                <button type="button" className="modal-button secondary" onClick={onClose}>取消</button>
                                <button type="submit" className="modal-button primary" disabled={isLoading}>
                                    {isLoading ? "保存中..." : "保存所有设置"}
                                </button>
                            </div>
                        )}
                </form>
            </div>
        </Modal>

    );
}

export default SpaceSettingsModal;


