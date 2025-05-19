// frontend/src/components/SpaceChatOrchestrator.js
import React, { useState, useEffect } from 'react';
import ChatInterface from './ChatInterface'; // The existing chat component
import Modal from './Modal';
import LoadingSpinner from './LoadingSpinner';
import './SpaceChatOrchestrator.css'; // New CSS file for this component

// Mock function (can be moved to a shared utils/api file later)
const mockCheckIfAppBlueprintExists = async (spaceId) => {
    console.log(`ORCHESTRATOR: Checking if APP-BP exists for space ${spaceId}`);
    await new Promise(resolve => setTimeout(resolve, 300));
    if (spaceId && (spaceId.includes("new") || spaceId.endsWith("empty") || parseInt(spaceId.slice(-1)) % 3 === 0 )) { // Example: new spaces need wizard
        console.log("ORCHESTRATOR: Mock says NO APP-BP exists.");
        return false;
    }
    console.log("ORCHESTRATOR: Mock says APP-BP EXISTS.");
    return true;
};

function SpaceChatOrchestrator({ spaceId, spaceType }) {
  const [showBlueprintModeSelection, setShowBlueprintModeSelection] = useState(false);
  const [isLoadingBlueprintStatus, setIsLoadingBlueprintStatus] = useState(true);
  const [initialChatMessage, setInitialChatMessage] = useState(null); // To pass to ChatInterface

  // State for Modals triggered by mode selection
  const [showLoadFromRepoModal, setShowLoadFromRepoModal] = useState(false);
  const [repoUrlInput, setRepoUrlInput] = useState('');

  const [showUploadFormModal, setShowUploadFormModal] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);

  const [showUploadJsonModal, setShowUploadJsonModal] = useState(false);
  const [jsonConfigInput, setJsonConfigInput] = useState('');
  
  const [isProcessingModeAction, setIsProcessingModeAction] = useState(false); // For modal submit loading

  useEffect(() => {
    if (spaceId) {
      setIsLoadingBlueprintStatus(true);
      setInitialChatMessage(null); // Clear previous initial message
      mockCheckIfAppBlueprintExists(spaceId)
        .then(exists => {
          if (exists) {
            setShowBlueprintModeSelection(false);
            setInitialChatMessage({ type: 'assistant', content: `欢迎回到 ${spaceType === 'dev' ? 'Dev' : 'Ops'} 空间! 此空间的应用蓝图已配置。我能为您做些什么？` });
          } else {
            setShowBlueprintModeSelection(true);
            // No initial message here, wizard provides text
          }
        })
        .catch(err => {
          console.error("Error checking for APP-BP:", err);
          setInitialChatMessage({ type: 'assistant', content: "无法检查应用蓝图状态，请稍后再试。" });
          setShowBlueprintModeSelection(false); // Default to chat on error
        })
        .finally(() => setIsLoadingBlueprintStatus(false));
    }
  }, [spaceId, spaceType]); // Rerun when spaceId or spaceType changes

  // Handlers for Blueprint Mode Selection
  const handleModeActionSubmit = async (mode, additionalData = {}) => {
    setShowBlueprintModeSelection(false); // Always transition to chat view
    setIsProcessingModeAction(true);
    let assistantResponse = "";

    // Simulate backend processing and generate an initial message for ChatInterface
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API delay

    switch (mode) {
      case 'interactiveChat':
        assistantResponse = "好的，让我们通过互动聊天来构建您的应用蓝图。请告诉我您想构建什么样的应用程序？它的核心功能是什么？";
        break;
      case 'fromRepo':
        setShowLoadFromRepoModal(false);
        assistantResponse = `收到！正在开始分析您提供的代码仓库: ${additionalData.repoUrl}。请稍等... (分析过程为模拟). 分析完成后，我们会一起确认和补齐蓝图信息。`;
        // TODO: Actual backend call: POST /api/blueprint/initiate-from-repo { spaceId, repoUrl }
        break;
      case 'uploadForm':
        setShowUploadFormModal(false);
        assistantResponse = `感谢您上传需求表单: ${additionalData.fileName}。正在进行分析... (分析过程为模拟). 分析完成后，我们将一起审核。`;
        // TODO: Actual backend call: POST /api/blueprint/initiate-from-form { spaceId, fileData, targetUsers: additionalData.targetUsers }
        break;
      case 'uploadJson':
        setShowUploadJsonModal(false);
        assistantResponse = "好的，应用蓝图 JSON 已收到。正在进行验证和解析... (过程为模拟). 完成后，我们来确认并补齐所需信息。";
        // TODO: Actual backend call: POST /api/blueprint/initiate-from-json { spaceId, jsonContent }
        break;
      default:
        assistantResponse = "已选择一个模式，让我们开始吧！";
        break;
    }
    setInitialChatMessage({ type: 'assistant', content: assistantResponse });
    setIsProcessingModeAction(false);
    // Reset form fields
    setRepoUrlInput(''); setUploadedFile(null); setJsonConfigInput('');
  };

  const handleFileChange = (event) => {
    if (event.target.files && event.target.files[0]) {
      setUploadedFile(event.target.files[0]);
    }
  };

  if (isLoadingBlueprintStatus) {
    return (
      <div className="orchestrator-loading">
        <LoadingSpinner />
        <p>正在检查空间应用蓝图状态...</p>
      </div>
    );
  }

  if (showBlueprintModeSelection) {
    return (
      <div className="blueprint-mode-selection-container"> {/* Changed class name */}
        <div className="blueprint-mode-selection-content">
          <h2>请选择您的应用蓝图 (APP-BP) 创建模式</h2>
          <p className="wizard-subtitle">选择一个方式来开始定义或导入您的应用规范。</p>
          <div className="mode-options-grid">
            <button className="mode-option-button" onClick={() => handleModeActionSubmit('interactiveChat')}>
              <span className="mode-icon">💬</span>
              <h3>互动聊天模式</h3>
              <p>通过与AI对话，逐步定义和完善您的应用需求。</p>
            </button>
            <button className="mode-option-button" onClick={() => setShowLoadFromRepoModal(true)}>
              <span className="mode-icon">📁</span>
              <h3>从现有代码库学习</h3>
              <p>让AI分析您已有的代码库，自动提取蓝图信息。</p>
            </button>
            <button className="mode-option-button" onClick={() => setShowUploadFormModal(true)}>
              <span className="mode-icon">📋</span>
              <h3>上传应用需求收集表单</h3>
              <p>上传结构化的需求文档 (如Excel, Word)，AI将解析内容。</p>
            </button>
            <button className="mode-option-button" onClick={() => setShowUploadJsonModal(true)}>
              <span className="mode-icon">⚙️</span>
              <h3>现有Blueprint JSON配置</h3>
              <p>直接上传或粘贴已有的APP-BP JSON文件进行编辑或构建。</p>
            </button>
          </div>
        </div>

        {/* Modals for specific wizard options */}
        {showLoadFromRepoModal && (
          <Modal isOpen={true} onClose={() => setShowLoadFromRepoModal(false)} title="从代码库学习蓝图">
            <form className="modal-form" onSubmit={(e) => { e.preventDefault(); handleModeActionSubmit('fromRepo', { repoUrl: repoUrlInput }); }}>
              <div className="form-group"><label htmlFor="scoRepoUrlInput">Git Repository URL (HTTPS):</label><input type="url" id="scoRepoUrlInput" value={repoUrlInput} onChange={(e) => setRepoUrlInput(e.target.value)} required placeholder="https://github.com/user/repo.git"/></div>
              <div className="modal-form-actions"><button type="button" className="modal-button secondary" onClick={() => setShowLoadFromRepoModal(false)}>取消</button><button type="submit" className="modal-button primary" disabled={isProcessingModeAction}>{isProcessingModeAction ? "分析中..." : "开始分析"}</button></div>
            </form>
          </Modal>
        )}
        {showUploadFormModal && (
          <Modal isOpen={true} onClose={() => setShowUploadFormModal(false)} title="上传需求收集表单">
            <form className="modal-form" onSubmit={(e) => { e.preventDefault(); if(uploadedFile) handleModeActionSubmit('uploadForm', { fileName: uploadedFile.name, file: uploadedFile /* Pass actual file object if backend handles upload */, targetUsers: e.target.targetUsers?.value }); else alert("Please select a file.")}}>
              <div className="form-group"><label htmlFor="scoReqFormFile">选择表单文件 (e.g., .docx, .txt):</label><input type="file" id="scoReqFormFile" onChange={handleFileChange} accept=".txt,.doc,.docx,.md,.pdf"/></div>
              <div className="form-group"><label htmlFor="scoTargetUsersForm">主要目标用户:</label><input type="text" id="scoTargetUsersForm" name="targetUsers" placeholder="e.g., 企业员工, 学生"/></div>
              <div className="modal-form-actions"><button type="button" className="modal-button secondary" onClick={() => setShowUploadFormModal(false)}>取消</button><button type="submit" className="modal-button primary" disabled={!uploadedFile || isProcessingModeAction}>{isProcessingModeAction ? "上传中..." : "上传并分析"}</button></div>
            </form>
          </Modal>
        )}
        {showUploadJsonModal && (
          <Modal isOpen={true} onClose={() => setShowUploadJsonModal(false)} title="上传 Blueprint JSON 配置">
            <form className="modal-form" onSubmit={(e) => { e.preventDefault(); handleModeActionSubmit('uploadJson', { jsonContent: jsonConfigInput }); }}>
              <div className="form-group"><label htmlFor="scoJsonConfigInput">粘贴 Blueprint JSON 内容:</label><textarea id="scoJsonConfigInput" value={jsonConfigInput} onChange={(e) => setJsonConfigInput(e.target.value)} rows="10" required placeholder='{ "metadata": { ... }, ... }'/></div>
              <div className="modal-form-actions"><button type="button" className="modal-button secondary" onClick={() => setShowUploadJsonModal(false)}>取消</button><button type="submit" className="modal-button primary" disabled={isProcessingModeAction}>{isProcessingModeAction ? "加载中..." : "加载并确认"}</button></div>
            </form>
          </Modal>
        )}
      </div>
    );
  }

  // If blueprint exists or a mode has been selected, show the actual ChatInterface
  return (
    <ChatInterface
      key={spaceId} // Ensure ChatInterface re-mounts or re-initializes if spaceId changes
      spaceId={spaceId}
      spaceType={spaceType}
      initialAssistantMessage={initialChatMessage} // Pass the initial message
    />
  );
}

export default SpaceChatOrchestrator;


