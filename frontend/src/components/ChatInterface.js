// frontend/src/components/ChatInterface.js
import React, { useState, useEffect, useRef } from 'react';
import ChatToolbar from './ChatToolbar';
import LoadingSpinner from './LoadingSpinner';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github.css';
import './ChatInterface.css';

const API_BASE_URL = 'http://localhost:5001/api';


// --- Helper Component for Tool Execution Display ---
const ToolExecutionBlock = ({ execution }) => {
    // Ensure execution and its properties are defined before accessing
    const status = execution?.status || 'unknown';
    const toolName = execution?.tool_name || 'Tool Execution';
    const args = execution?.tool_arguments || {};
    const output = execution?.tool_output;

    return (
        <div className={`tool-execution-block status-${status}`}>
            <div className="tool-execution-header">
                <strong>Tool:</strong> {toolName}
                {status && ` (${status.charAt(0).toUpperCase() + status.slice(1)})`}
            </div>
            <div className="tool-execution-details">
                {args && Object.keys(args).length > 0 && (
                    <>
                        <p><strong>Arguments:</strong></p>
                        <pre>{JSON.stringify(args, null, 2)}</pre>
                    </>
                )}
                <p><strong>Output:</strong></p>
                {typeof output === 'object' && output !== null ? (
                    <pre>{JSON.stringify(output, null, 2)}</pre>
                ) : (
                    <pre>{String(output === undefined || output === null ? '(No output or void)' : output)}</pre>
                )}
            </div>
        </div>
    );
};

const LONG_MESSAGE_LINE_THRESHOLD = 3;
const MAX_INITIAL_MESSAGE_HEIGHT = '4.5em'; // Approx 3 lines for line-height 1.5

// Fetches initial chat data (session and recent messages)
const fetchInitialChatDataAPI = async (spaceId) => {
    if (!spaceId) {
        console.warn("ChatInterface: No spaceId, cannot fetch initial chat data.");
        return {
            session_id: `temp-session-${Date.now()}`,
            session_name: "Chat (No Space Context)",
            messages: [{ type: 'assistant', role: 'assistant', id: `init-error-${Date.now()}`, content: 'Error: Space context is missing. Cannot load or start chat.' }],
            token_info: { message: "No active session." }
        };
    }
    console.log(`ChatInterface: Fetching initial chat data for space ${spaceId}`);
    try {
        const response = await fetch(`${API_BASE_URL}/sessions/space/${spaceId}/active-chat`);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: response.statusText, error: `HTTP ${response.status}` }));
            throw new Error(`Backend error: ${response.status} - ${errorData.error || 'Failed to fetch active session'}`);
        }
        const data = await response.json();
        console.log("ChatInterface: Received initial chat data from backend:", data);
        return data; // Expects { session_id, session_name, messages: [], token_info, ... }
    } catch (error) {
        console.error("ChatInterface: Error in fetchInitialChatDataAPI:", error);
        throw error;
    }
};



function ChatInterface({ spaceId, spaceType, initialAssistantMessageFromOrchestrator, appBlueprintStatus }) {
  // appBlueprintStatus: prop indicating if blueprint is considered complete ('complete', 'incomplete', 'unknown')
  // This would ideally come from SpaceDetailPage -> SpaceChatOrchestrator -> ChatInterface

  const [messages, setMessages] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [sessionName, setSessionName] = useState("Chat Conversation");
  const [isLoadingChat, setIsLoadingChat] = useState(true);
  const [chatError, setChatError] = useState(null);

  const [inputValue, setInputValue] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [tokenInfo, setTokenInfo] = useState(null);
  const messagesEndRef = useRef(null);
  const [expandedMessages, setExpandedMessages] = useState({});

  useEffect(() => {
    if (spaceId) {
      setIsLoadingChat(true);
      setChatError(null);
      setMessages([]);
      setActiveSessionId(null);
      setTokenInfo(null);
      setExpandedMessages({});

      console.log("ChatInterface: useEffect for initial load. spaceId:", spaceId, "initialMsgFromOrchestrator:", initialAssistantMessageFromOrchestrator, "appBlueprintStatus:", appBlueprintStatus);

      fetchInitialChatDataAPI(spaceId)
        .then(data => {
          if (data && data.session_id) {
            setActiveSessionId(data.session_id);
            setSessionName(data.session_name || `Session ${data.session_id.slice(0,8)}`);
            setTokenInfo(data.token_info);

            let historicalMessages = (data.messages || []).map((msg, index) => ({
                type: msg.role === 'tool_result' || msg.role === 'tool_call' ? 'toolInfo' : msg.role,
                id: msg.db_id || `hist-${data.session_id}-${msg.timestamp || index}-${Math.random().toString(36).substring(2,7)}`,
                content: (msg.role === 'tool_call' || msg.role === 'tool_result') && msg.metadata ? 
                         <ToolExecutionBlock execution={{ /* ... construct execution object ... */ }} /> 
                         : msg.content,
                role: msg.role 
            }));
            
            console.log("ChatInterface: Fetched historical messages count:", historicalMessages.length);
            setMessages(historicalMessages); // Set historical messages first

            // Now, conditionally add the welcome/summary message
            let assistantWelcomeContent = "";
            if (initialAssistantMessageFromOrchestrator && initialAssistantMessageFromOrchestrator.content) {
              // This means user just came from a wizard flow for a likely new blueprint
              assistantWelcomeContent = initialAssistantMessageFromOrchestrator.content;
            } else if (historicalMessages.length > 0) {
              // User is returning to an existing conversation
              let bpStatusMessage = "应用蓝图状态未知。";
              if (appBlueprintStatus === 'complete') {
                bpStatusMessage = "应用蓝图已生成。";
              } else if (appBlueprintStatus === 'incomplete') {
                bpStatusMessage = "应用蓝图仍在构建中或不完整。";
              }
              assistantWelcomeContent = `欢迎回来！已加载最近 ${historicalMessages.length} 条会话消息。${bpStatusMessage} 我能为您做些什么？`;
            } else {
              // No history and no specific orchestrator message (should be rare if orchestrator handles new space wizard)
              // This path is now more likely if a space exists but has zero chat history.
              assistantWelcomeContent = `Welcome to this ${spaceType} space: '${sessionName}'. 看起来这是一个新的会话。${appBlueprintStatus === 'incomplete' ? '让我们开始构建您的应用蓝图吧！' : '我能为您做些什么？'}`;
            }

            // Add the constructed welcome message *after* setting historical messages
            // Use a slight delay to ensure history renders first, then the welcome.
            setTimeout(() => {
                 addMessageToUIManually('assistant', assistantWelcomeContent, 'assistant', null, `welcome-${data.session_id}-${Date.now()}`);
            }, 0);


          } else { 
            const errMsg = data.error || "Failed to initialize chat session. No session ID.";
            setChatError(errMsg);
            addMessageToUIManually('assistant', errMsg, 'assistant', null, 'error-init-msg');
          }
        })
        .catch(err => {
          console.error("ChatInterface: Main load error", err);
          const errMsg = err.message || "Could not load chat session.";
          setChatError(errMsg);
          addMessageToUIManually('assistant', `Error loading chat: ${errMsg}`, 'assistant', null, 'error-catch-msg');
        })
        .finally(() => {
          setIsLoadingChat(false);
        });
    } else {
        setIsLoadingChat(false);
        addMessageToUIManually('assistant', "Please select or create a space to begin.", 'assistant', null, 'no-space-msg');
    }
  // Key dependencies: spaceId to trigger load.
  // initialAssistantMessageFromOrchestrator and appBlueprintStatus are used to formulate welcome message.
  // spaceType is also for welcome message.
  }, [spaceId, spaceType, initialAssistantMessageFromOrchestrator, appBlueprintStatus]);


  useEffect(() => {
    if (!isLoadingChat) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoadingChat]);

  const toggleMessageExpansion = (messageId) => setExpandedMessages(prev => ({ ...prev, [messageId]: !prev[messageId] }));

  // addMessageToUIManually now takes an optional explicit ID
  const addMessageToUIManually = (type, content, roleForType, toolExecutions = null, explicitId = null) => {
    const messageId = explicitId || `msg-${type}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newMessagesPayload = [];

    if (content || typeof content === 'string') { // Allow empty string content for assistant thinking
        newMessagesPayload.push({ type, content, id: messageId, role: roleForType });
    }
    if (toolExecutions && toolExecutions.length > 0) {
        toolExecutions.forEach((exec, index) => {
            newMessagesPayload.push({
                type: 'toolInfo', role: 'toolInfo',
                id: `${messageId}-tool-${index}`,
                content: <ToolExecutionBlock execution={exec} />
            });
        });
    }
    if (newMessagesPayload.length > 0) {
        setMessages(prev => [...prev, ...newMessagesPayload]);
    }
    return messageId;
  };

  const processAndSendUserMessage = async (messageText, isToolInvocation = false, toolDetails = null) => {
    // ... (logic as before: check activeSessionId, add user message to UI via addMessageToUIManually)
    // ... (API call to /api/chat/)
    // ... (handle response: call addMessageToUIManually for assistant message and tool executions)
    // ...
    if ((!messageText || !messageText.trim()) && !isToolInvocation) return;
    if (!activeSessionId) { alert("Chat session is not active."); return; }

    let userDisplayMessage = messageText;
    if (isToolInvocation && toolDetails) userDisplayMessage = `Using Tool: ${toolDetails.label}`;
    addMessageToUIManually('user', userDisplayMessage, 'user');
    if (!isToolInvocation) setInputValue('');
    setIsSendingMessage(true);

    try {
      const payload = { message: messageText, spaceId, spaceType, sessionId: activeSessionId };
      const response = await fetch(`${API_BASE_URL}/chat/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error || `Backend error: ${response.status}`);

      if (data.llm_message || (data.tool_executions && data.tool_executions.length > 0)) {
        addMessageToUIManually('assistant', data.llm_message, 'assistant', data.tool_executions);
      } else if (data.error) {
        addMessageToUIManually('assistant', `Error: ${data.error} ${data.details || ''}`, 'assistant');
      }
      if (data.token_info) setTokenInfo(data.token_info);
    } catch (error) {
      addMessageToUIManually('assistant', `Error: ${error.message}`, 'assistant');
    } finally {
      setIsSendingMessage(false);
    }
  };
  
  const handleSendMessage = (event) => { event.preventDefault(); processAndSendUserMessage(inputValue.trim(), false); };
  const handleToolSubmission = (toolId, formData, toolLabel) => {
    const toolExecutionPrompt = `User initiated tool: '${toolLabel}' (ID: ${toolId}) with parameters: ${JSON.stringify(formData)}. Please proceed.`;
    processAndSendUserMessage(toolExecutionPrompt, true, { id: toolId, formData, label: toolLabel });
  };
  const handleInputChange = (event) => setInputValue(event.target.value);
  const isMessageContentLong = (content) => {
      if (typeof content !== 'string') return false;
      const lineCount = (content.match(/\n/g) || []).length + 1;
      return lineCount > LONG_MESSAGE_LINE_THRESHOLD || content.length > 200;
  };


  if (isLoadingChat) {
    return <div className="chat-interface-container loading-chat-history"><LoadingSpinner /><p>Loading conversation...</p></div>;
  }

  return (
    <div className="chat-interface-container">
      {tokenInfo && <div className="token-info-bar">{tokenInfo.message}</div>}
      <div className="message-list">
        {messages.map((msg) => (
          <div key={msg.id} className={`message ${msg.type}`}>
            <div
              className={`message-content ${
                msg.type !== 'toolInfo' && typeof msg.content === 'string' && isMessageContentLong(msg.content) && !expandedMessages[msg.id] ? 'clamped' : ''
              }`}
              style={msg.type !== 'toolInfo' && typeof msg.content === 'string' && isMessageContentLong(msg.content) && !expandedMessages[msg.id] ? { maxHeight: MAX_INITIAL_MESSAGE_HEIGHT } : {}}
            >
              {(msg.type === 'assistant' || msg.type === 'user') && typeof msg.content === 'string' ? (
                <ReactMarkdown
                  children={msg.content}
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeRaw, rehypeHighlight]}
                />
              ) : (
                msg.content
              )}
            </div>
            {msg.type !== 'toolInfo' && typeof msg.content === 'string' && isMessageContentLong(msg.content) && (
              <button className="expand-collapse-button" onClick={() => toggleMessageExpansion(msg.id)}>
                {expandedMessages[msg.id] ? 'Show Less ↑' : 'Show More ↓'}
              </button>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      {isSendingMessage && <div className="typing-indicator">Assistant is thinking or tool is running...</div>}
      
      <ChatToolbar spaceType={spaceType} onToolSubmit={handleToolSubmission} spaceId={spaceId} />
      
      <form className="message-input-form" onSubmit={handleSendMessage}>
        <input 
            type="text" 
            value={inputValue} 
            onChange={handleInputChange} 
            placeholder="Ask your DevOps assistant, or use a tool above..." 
            disabled={isSendingMessage || isLoadingChat} 
        />
        <button type="submit" disabled={isSendingMessage || isLoadingChat}>Send</button>
      </form>
    </div>
  );
}
export default ChatInterface;


