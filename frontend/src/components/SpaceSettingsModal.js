// frontend/src/components/SpaceSettingsModal.js
import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import Accordion from './Accordion'; // For organizing settings
import LoadingSpinner from '../components/LoadingSpinner';
import './SpaceSettingsModal.css'; // Create this CSS



// Mock function to fetch current settings - replace with API call
const mockFetchSpaceBackendSettings = async (spaceId) => {
    console.log(`Fetching backend settings for space ${spaceId}`);
    await new Promise(resolve => setTimeout(resolve, 300));
    // This should match the structure used in ChatToolbar's backend settings modal
    return {
        llmSource: 'gemini',
        geminiApiKeyStatus: 'set', // 'set', 'not_set'
        chatGptApiKeyStatus: 'not_set',
        otherLlmEndpoint: '',
        agentType: 'default_dev_agent',
        mcpServerUrl: 'https://my-ci-cd.example.com',
        debugVCIService: 'docker', // 'docker', 'aws_fargate', 'azure_aci'
        debugVCIEndpoint: 'unix:///var/run/docker.sock',
        k8sProdContext: 'prod-cluster-us-east-1',
        k8sStagingContext: 'staging-cluster-dev',
        codeStorageProvider: 'github', // 'github', 'gitlab', 'azure_devops'
        codeStorageApiTokenStatus: 'set'
    };
};

// Mock function to save settings - replace with API call
const mockSaveSpaceBackendSettings = async (spaceId, settings) => {
    console.log(`Saving backend settings for space ${spaceId}:`, settings);
    await new Promise(resolve => setTimeout(resolve, 700));
    // In a real scenario, only send changed/new API keys if they are not just placeholders
    return { success: true, message: "Space backend settings updated successfully!" };
};


function SpaceSettingsModal({ isOpen, onClose, spaceId, spaceType }) {
    const [settings, setSettings] = useState({
        llmSource: 'gemini', geminiApiKey: '', chatGptApiKey: '', otherLlmEndpoint: '',
        agentType: '', mcpServerUrl: '', mcpServerApiKey: '',
        debugVCIService: 'docker', debugVCIEndpoint: '', debugVCICreds: '',
        k8sProdContext: '', k8sStagingContext: '', k8sTestContext: '',
        codeStorageProvider: 'github', codeStorageApiToken: ''
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isOpen && spaceId) {
            setIsLoading(true); setError(null);
            mockFetchSpaceBackendSettings(spaceId)
                .then(data => {
                    // Only update fields that are returned, keep current input for keys if not returned
                    setSettings(prev => ({
                        ...prev, // Keep existing input for keys
                        llmSource: data.llmSource || prev.llmSource,
                        otherLlmEndpoint: data.otherLlmEndpoint || '',
                        agentType: data.agentType || '',
                        mcpServerUrl: data.mcpServerUrl || '',
                        debugVCIService: data.debugVCIService || 'docker',
                        debugVCIEndpoint: data.debugVCIEndpoint || '',
                        k8sProdContext: data.k8sProdContext || '',
                        k8sStagingContext: data.k8sStagingContext || '',
                        k8sTestContext: data.k8sTestContext || '',
                        codeStorageProvider: data.codeStorageProvider || 'github',
                        // Do not prefill API keys from fetched status, only from user input
                    }));
                })
                .catch(err => { console.error(err); setError("Failed to load current settings."); })
                .finally(() => setIsLoading(false));
        }
    }, [isOpen, spaceId]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setSettings(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true); setError(null);
        // Construct payload, be careful with sending empty API keys if they mean "don't change"
        const payloadToSave = { ...settings };
        // If API keys are empty, you might not want to send them or send a specific signal to clear/keep them
        if (!payloadToSave.geminiApiKey) delete payloadToSave.geminiApiKey; // Example: don't send if empty
        if (!payloadToSave.chatGptApiKey) delete payloadToSave.chatGptApiKey;
        if (!payloadToSave.mcpServerApiKey) delete payloadToSave.mcpServerApiKey;
        if (!payloadToSave.debugVCICreds) delete payloadToSave.debugVCICreds;
        if (!payloadToSave.codeStorageApiToken) delete payloadToSave.codeStorageApiToken;


        try {
            const result = await mockSaveSpaceBackendSettings(spaceId, payloadToSave);
            if (result.success) {
                alert(result.message);
                onClose();
            } else {
                throw new Error(result.error || "Failed to save settings.");
            }
        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const llmApiKeyField = () => {
        if (settings.llmSource === 'gemini') {
            return <div className="form-group"><label htmlFor="geminiApiKey">Gemini API Key:</label><input type="password" id="geminiApiKey" name="geminiApiKey" value={settings.geminiApiKey} onChange={handleChange} placeholder="Leave blank to keep existing"/></div>;
        }
        if (settings.llmSource === 'chatgpt') {
            return <div className="form-group"><label htmlFor="chatGptApiKey">ChatGPT API Key:</label><input type="password" id="chatGptApiKey" name="chatGptApiKey" value={settings.chatGptApiKey} onChange={handleChange} placeholder="Leave blank to keep existing"/></div>;
        }
        if (settings.llmSource === 'other') {
            return <div className="form-group"><label htmlFor="otherLlmEndpoint">Other LLM Endpoint URL:</label><input type="url" id="otherLlmEndpoint" name="otherLlmEndpoint" value={settings.otherLlmEndpoint} onChange={handleChange} required/></div>;
        }
        return null;
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Space Settings (${spaceType})`} modalClassName="space-settings-modal wide">
            {isLoading && <div className="modal-loading-overlay"><LoadingSpinner /> <p>Loading settings...</p></div>}
            {error && <p className="error-message modal-error">{error}</p>}
            <form onSubmit={handleSubmit} className="modal-form space-settings-form">
                <Accordion title="LLM & Agent Configuration" initialOpen={true}>
                    <div className="form-group">
                        <label htmlFor="llmSource">LLM Source:</label>
                        <select id="llmSource" name="llmSource" value={settings.llmSource} onChange={handleChange}>
                            <option value="gemini">Gemini</option><option value="chatgpt">ChatGPT</option><option value="other">Other (Custom)</option>
                        </select>
                    </div>
                    {llmApiKeyField()}
                    <div className="form-group">
                        <label htmlFor="agentType">Agent Type/Configuration:</label>
                        <input type="text" id="agentType" name="agentType" value={settings.agentType} onChange={handleChange} placeholder="e.g., default_dev_agent"/>
                    </div>
                </Accordion>

                <Accordion title="Debug Environment (VCI)" initialOpen={false}>
                    <div className="form-group">
                        <label htmlFor="debugVCIService">VCI Provider:</label>
                        <select id="debugVCIService" name="debugVCIService" value={settings.debugVCIService} onChange={handleChange}>
                            <option value="docker">Local Docker</option><option value="aws_fargate">AWS Fargate</option><option value="azure_aci">Azure ACI</option><option value="gcp_cloudrun">GCP Cloud Run</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label htmlFor="debugVCIEndpoint">Endpoint/Config:</label>
                        <input type="text" id="debugVCIEndpoint" name="debugVCIEndpoint" value={settings.debugVCIEndpoint} onChange={handleChange} placeholder="e.g., unix:///var/run/docker.sock or API endpoint"/>
                    </div>
                     <div className="form-group">
                        <label htmlFor="debugVCICreds">Credentials (if needed):</label>
                        <input type="password" id="debugVCICreds" name="debugVCICreds" value={settings.debugVCICreds} onChange={handleChange} placeholder="Leave blank to keep existing"/>
                    </div>
                </Accordion>

                <Accordion title="K8s Deployment Environments" initialOpen={false}>
                    <p>Configure contexts/API endpoints for Test, Grayscale, and Production Kubernetes clusters.</p>
                    <div className="form-group"><label htmlFor="k8sTestContext">Test Env K8s Context/API:</label><input type="text" id="k8sTestContext" name="k8sTestContext" value={settings.k8sTestContext} onChange={handleChange}/></div>
                    <div className="form-group"><label htmlFor="k8sStagingContext">Grayscale Env K8s Context/API:</label><input type="text" id="k8sStagingContext" name="k8sStagingContext" value={settings.k8sStagingContext} onChange={handleChange}/></div>
                    <div className="form-group"><label htmlFor="k8sProdContext">Production Env K8s Context/API:</label><input type="text" id="k8sProdContext" name="k8sProdContext" value={settings.k8sProdContext} onChange={handleChange}/></div>
                </Accordion>

                <Accordion title="Remote Code Storage" initialOpen={false}>
                     <div className="form-group">
                        <label htmlFor="codeStorageProvider">Provider:</label>
                        <select id="codeStorageProvider" name="codeStorageProvider" value={settings.codeStorageProvider} onChange={handleChange}>
                            <option value="github">GitHub</option><option value="gitlab">GitLab</option><option value="azure_devops">Azure DevOps Repos</option><option value="other">Other Git Server</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label htmlFor="codeStorageApiToken">API Token/PAT (for MCP actions):</label>
                        <input type="password" id="codeStorageApiToken" name="codeStorageApiToken" value={settings.codeStorageApiToken} onChange={handleChange} placeholder="Leave blank to keep existing"/>
                    </div>
                </Accordion>
                
                <Accordion title="MCP Server (Optional)" initialOpen={false}>
                    <div className="form-group"><label htmlFor="mcpServerUrl">MCP Server URL:</label><input type="url" id="mcpServerUrl" name="mcpServerUrl" value={settings.mcpServerUrl} onChange={handleChange} placeholder="e.g., https://jenkins.example.com"/></div>
                    <div className="form-group"><label htmlFor="mcpServerApiKey">MCP Server API Key:</label><input type="password" id="mcpServerApiKey" name="mcpServerApiKey" value={settings.mcpServerApiKey} onChange={handleChange} placeholder="Leave blank to keep existing"/></div>
                </Accordion>


                <div className="modal-form-actions">
                    <button type="button" className="modal-button secondary" onClick={onClose}>Cancel</button>
                    <button type="submit" className="modal-button primary" disabled={isLoading}>
                        {isLoading ? "Saving..." : "Save Settings"}
                    </button>
                </div>
            </form>
        </Modal>
    );
}

export default SpaceSettingsModal;


