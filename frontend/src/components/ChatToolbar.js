// frontend/src/components/ChatToolbar.js
import React, { useState, useRef, useEffect } from 'react';
import Modal from './Modal';
import DropdownMenu from './DropdownMenu'; // For "More Tools"
import { devTools, opsTools } from '../config/toolConfigs';
import './ChatToolbar.css';

const MAX_PRIMARY_TOOLS = 3; // Show 3 tools directly, rest under "More"

function ChatToolbar({ spaceType, onToolSubmit, spaceId /* For settings context */ }) {
  const [activeTool, setActiveTool] = useState(null); // Tool config for the currently open modal
  const [toolFormData, setToolFormData] = useState({});
  const [showMoreToolsDropdown, setShowMoreToolsDropdown] = useState(false);
  const [showBackendSettingsModal, setShowBackendSettingsModal] = useState(false);

  // Mock state for backend settings - replace with actual fetched/saved values
  const [backendSettings, setBackendSettings] = useState({
    llmSource: 'gemini', // 'gemini', 'chatgpt', 'other'
    geminiApiKey: '',
    chatGptApiKey: '',
    otherLlmEndpoint: '',
    agentType: 'default', // 'default', 'custom_agent_x'
    mcpServerUrl: '',
    mcpServerApiKey: '',
  });

  const moreToolsButtonRef = useRef(null);
  const settingsButtonRef = useRef(null);


  const allToolsForSpace = spaceType === 'dev' ? devTools : opsTools;
  const primaryTools = allToolsForSpace.filter(tool => tool.primary).slice(0, MAX_PRIMARY_TOOLS);
  const secondaryTools = [
      ...allToolsForSpace.filter(tool => tool.primary).slice(MAX_PRIMARY_TOOLS),
      ...allToolsForSpace.filter(tool => !tool.primary)
  ];

  const openToolModal = (toolConfig) => {
    const initialFormData = {};
    if (toolConfig.fields) {
      toolConfig.fields.forEach(field => {
        initialFormData[field.name] = field.defaultValue !== undefined ? field.defaultValue : (field.type === 'checkbox' ? false : '');
      });
    }
    setToolFormData(initialFormData);
    setActiveTool(toolConfig);
    setShowMoreToolsDropdown(false); // Close dropdown if a tool is selected from it
  };

  const closeToolModal = () => {
    setActiveTool(null);
    setToolFormData({});
  };

  const handleToolInputChange = (fieldName, value, type) => {
    setToolFormData(prev => ({ ...prev, [fieldName]: type === 'checkbox' ? value : value }));
  };

  const handleToolFormSubmit = (e) => {
    e.preventDefault();
    if (!activeTool) return;
    onToolSubmit(activeTool.id, toolFormData, activeTool.label);
    closeToolModal();
  };

  const handleBackendSettingsChange = (e) => {
    const { name, value } = e.target;
    setBackendSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveBackendSettings = (e) => {
    e.preventDefault();
    console.log("Saving backend settings for space:", spaceId, backendSettings);
    // TODO: API call to save these settings for the current spaceId
    alert("Backend settings saved (mocked)!");
    setShowBackendSettingsModal(false);
  };

  const moreToolsMenuItems = secondaryTools.map(tool => ({
    label: tool.label,
    onClick: () => openToolModal(tool)
  }));

  return (
    <>
      <div className="chat-tools-bar">
        <div className="tools-buttons-group">
            {primaryTools.map(tool => (
            <button
                key={tool.id}
                className="tool-button"
                onClick={() => openToolModal(tool)}
                title={tool.label}
            >
                {tool.label}
            </button>
            ))}
            {secondaryTools.length > 0 && (
                <div className="dropdown-container more-tools-container" ref={moreToolsButtonRef}>
                    <button
                    className="tool-button more-tools-button"
                    onClick={() => setShowMoreToolsDropdown(!showMoreToolsDropdown)}
                    >
                    More Tools ▾
                    </button>
                    {showMoreToolsDropdown && (
                    <DropdownMenu
                        items={moreToolsMenuItems}
                        onClose={() => setShowMoreToolsDropdown(false)}
                        align="left" // Or calculate based on position
                    />
                    )}
                </div>
            )}
        </div>
        <div className="chat-toolbar-settings-container" ref={settingsButtonRef}>
            <button
                className="chat-settings-button"
                onClick={() => setShowBackendSettingsModal(true)}
                title="Space Backend Settings"
            >
                ⚙️ {/* Settings Icon */}
            </button>
        </div>
      </div>

      {/* Active Tool Modal (same as before) */}
      {activeTool && (
        <Modal
          isOpen={!!activeTool}
          onClose={closeToolModal}
          title={activeTool.modalTitle}
          footerContent={!activeTool.confirmationMessage && (
            <>
              <button type="button" className="modal-button secondary" onClick={closeToolModal}>Cancel</button>
              <button type="submit" form={`tool-form-${activeTool.id}`} className="modal-button primary">
                {activeTool.label}
              </button>
            </>
          )}
        >
          {/* ... (modal content for tool fields or confirmation - same as before) ... */}
          {activeTool.confirmationMessage ? ( <div className="tool-confirmation"> <p>{activeTool.confirmationMessage}</p> <div className="modal-form-actions"> <button type="button" className="modal-button secondary" onClick={closeToolModal}>Cancel</button> <button type="button" className="modal-button primary" onClick={() => { onToolSubmit(activeTool.id, {}, activeTool.label); closeToolModal(); }}> Confirm </button> </div> </div> ) : ( <form id={`tool-form-${activeTool.id}`} className="modal-form" onSubmit={handleToolFormSubmit}> {activeTool.fields && activeTool.fields.map(field => ( <div className="form-group" key={field.name}> <label htmlFor={`tool-field-${field.name}`}>{field.label}</label> {field.type === 'text' && ( <input type="text" id={`tool-field-${field.name}`} value={toolFormData[field.name] || ''} onChange={(e) => handleToolInputChange(field.name, e.target.value, field.type)} placeholder={field.placeholder} /> )} {field.type === 'number' && ( <input type="number" id={`tool-field-${field.name}`} value={toolFormData[field.name] || ''} onChange={(e) => handleToolInputChange(field.name, e.target.value, field.type)} placeholder={field.placeholder} /> )} {field.type === 'checkbox' && ( <div className="checkbox-wrapper"> <input type="checkbox" id={`tool-field-${field.name}`} checked={!!toolFormData[field.name]} onChange={(e) => handleToolInputChange(field.name, e.target.checked, field.type)} /> </div> )} </div> ))} </form> )}
        </Modal>
      )}

      {/* Space Backend Settings Modal */}
      {showBackendSettingsModal && (
        <Modal
          isOpen={showBackendSettingsModal}
          onClose={() => setShowBackendSettingsModal(false)}
          title="Space Backend Settings"
        >
          <form onSubmit={handleSaveBackendSettings} className="modal-form backend-settings-form">
            <div className="form-group">
              <label htmlFor="llmSource">LLM Source:</label>
              <select id="llmSource" name="llmSource" value={backendSettings.llmSource} onChange={handleBackendSettingsChange}>
                <option value="gemini">Gemini</option>
                <option value="chatgpt">ChatGPT</option>
                <option value="other">Other (Custom Endpoint)</option>
              </select>
            </div>

            {backendSettings.llmSource === 'gemini' && (
              <div className="form-group">
                <label htmlFor="geminiApiKey">Gemini API Key:</label>
                <input type="password" id="geminiApiKey" name="geminiApiKey" value={backendSettings.geminiApiKey} onChange={handleBackendSettingsChange} placeholder="Enter Gemini API Key" />
              </div>
            )}
            {backendSettings.llmSource === 'chatgpt' && (
              <div className="form-group">
                <label htmlFor="chatGptApiKey">ChatGPT API Key:</label>
                <input type="password" id="chatGptApiKey" name="chatGptApiKey" value={backendSettings.chatGptApiKey} onChange={handleBackendSettingsChange} placeholder="Enter ChatGPT API Key" />
              </div>
            )}
            {backendSettings.llmSource === 'other' && (
              <div className="form-group">
                <label htmlFor="otherLlmEndpoint">Custom LLM Endpoint:</label>
                <input type="url" id="otherLlmEndpoint" name="otherLlmEndpoint" value={backendSettings.otherLlmEndpoint} onChange={handleBackendSettingsChange} placeholder="https://api.example.com/llm" />
              </div>
            )}

            <div className="form-group">
              <label htmlFor="agentType">Agent Type:</label>
              <input type="text" id="agentType" name="agentType" value={backendSettings.agentType} onChange={handleBackendSettingsChange} placeholder="e.g., default, custom_rag_agent" />
            </div>
            <div className="form-group">
              <label htmlFor="mcpServerUrl">MCP Server URL (Optional):</label>
              <input type="url" id="mcpServerUrl" name="mcpServerUrl" value={backendSettings.mcpServerUrl} onChange={handleBackendSettingsChange} placeholder="e.g., https://ci.example.com" />
            </div>
            <div className="form-group">
              <label htmlFor="mcpServerApiKey">MCP Server API Key (Optional):</label>
              <input type="password" id="mcpServerApiKey" name="mcpServerApiKey" value={backendSettings.mcpServerApiKey} onChange={handleBackendSettingsChange} />
            </div>

            <div className="modal-form-actions">
              <button type="button" className="modal-button secondary" onClick={() => setShowBackendSettingsModal(false)}>Cancel</button>
              <button type="submit" className="modal-button primary">Save Settings</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

export default ChatToolbar;


