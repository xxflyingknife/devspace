// frontend/src/components/ChatInterface.js
import React, { useState, useEffect, useRef } from 'react';
import ChatToolbar from './ChatToolbar';
import LoadingSpinner from './LoadingSpinner'; // Ensure this component exists
import ReactMarkdown from 'react-markdown'; // <--- IMPORT ReactMarkdown
import remarkGfm from 'remark-gfm';         // <--- IMPORT GFM plugin
import rehypeRaw from 'rehype-raw';           // <--- IMPORT rehype-raw for HTML
import rehypeHighlight from 'rehype-highlight'; // <--- IMPORT syntax highlighting plugin
import 'highlight.js/styles/github.css'; // <--- IMPORT a highlight.js CSS theme (e.g., GitHub theme)

import './ChatInterface.css';

const API_BASE_URL = 'http://localhost:5001/api'; // Centralize if not already

// Helper to render tool execution blocks
const ToolExecutionBlock = ({ execution }) => {
    return (
        <div className={`tool-execution-block status-${execution.status}`}>
            <div className="tool-execution-header">
                <strong>Tool Executed:</strong> {execution.tool_name}
                {execution.status === 'success' ? ' (Success)' : ' (Error)'}
            </div>
            <div className="tool-execution-details">
                <p><strong>Arguments:</strong></p>
                <pre>{JSON.stringify(execution.tool_arguments, null, 2)}</pre>
                <p><strong>Output:</strong></p>
                {typeof execution.tool_output === 'object' ? (
                    <pre>{JSON.stringify(execution.tool_output, null, 2)}</pre>
                ) : (
                    <pre>{String(execution.tool_output)}</pre>
                )}
            </div>
        </div>
    );
};

const LONG_MESSAGE_LINE_THRESHOLD = 3;
const MAX_INITIAL_MESSAGE_HEIGHT = '3.5em'; // Approx 3 lines for line-height: 1.5


// NEW function to fetch initial chat data
const fetchInitialChatDataAPI = async (spaceId) => {
    if (!spaceId) {
        console.warn("ChatInterface: No spaceId, cannot fetch initial chat data.");
        // Return a default structure so the component doesn't break
        return {
            session_id: `temp-session-${Date.now()}`, // Temporary session ID
            session_name: "New Chat",
            messages: [{ type: 'assistant', id: `init-${Date.now()}`, content: 'Please select or configure a space.' }],
            token_info: { message: "No active session." }
        };
    }
    console.log(`ChatInterface: Fetching initial chat data for space ${spaceId}`);
    try {
        const response = await fetch(`${API_BASE_URL}/sessions/space/${spaceId}/active-chat`);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: response.statusText }));
            throw new Error(`Backend error: ${response.status} - ${errorData.error || 'Failed to fetch active session'}`);
        }
        const data = await response.json();
        console.log("ChatInterface: Received initial chat data:", data);
        return data;
    } catch (error) {
        console.error("ChatInterface: Error in fetchInitialChatDataAPI:", error);
        throw error;
    }
};


function ChatInterface({ spaceId, spaceType,initialAssistantMessage }) {
  const [messages, setMessages] = useState([]);
//    const initialMessages = [];
//    if (initialAssistantMessage && initialAssistantMessage.content) {
//      initialMessages.push({
//        type: 'assistant',
//        id: initialAssistantMessage.id || `init-msg-${Date.now()}`, // Ensure ID
//        content: initialAssistantMessage.content
//      });
//    } else { // Default if no initial message
//      initialMessages.push({
//        type: 'assistant',
//        id: `default-init-${Date.now()}`,
//        content: `Hello! I am your Vibe DevOps Assistant for this ${spaceType} space. How can I help you today?`
//      });
//    }
//    return initialMessages;
//  });

  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [tokenInfo, setTokenInfo] = useState(null);
  const messagesEndRef = useRef(null);
  const [expandedMessages, setExpandedMessages] = useState({});

  const [activeSessionId, setActiveSessionId] = useState(null);
  const [sessionName, setSessionName] = useState("Chat");
  const [isLoadingChat, setIsLoadingChat] = useState(true); // For initial load
  const [chatError, setChatError] = useState(null);
  const [isSendingMessage, setIsSendingMessage] = useState(false); // Renamed from isLoading

    // Effect to load initial chat session and messages
  useEffect(() => {
    if (spaceId) {
      setIsLoadingChat(true);
      setChatError(null);
      setMessages([]); // Clear previous messages
      setActiveSessionId(null);

          console.log("ChatInterface: useEffect for initial load/message. spaceId:", spaceId, "initialAssistantMessage:", initialAssistantMessage);

      if (initialAssistantMessage && initialAssistantMessage.content) {
        // If SpaceChatOrchestrator provided an initial message (e.g., after wizard), use that.
        // This implies a new session might have just been effectively started by the wizard choice.
        // We might still want to fetch the session_id for this new interaction.
        console.log("ChatInterface: Using initialAssistantMessage from orchestrator.");
        const welcomeMessageId = initialAssistantMessage.id || `init-msg-${Date.now()}-${Math.random()}`;
        setMessages([{ ...initialAssistantMessage, id: welcomeMessageId }]);
        // We still need a session ID for subsequent calls.
        // The backend's get_or_create_default_session will handle creating one if it's truly new.
        fetchInitialChatDataAPI(spaceId)
            .then(data => {
                if (data && data.session_id) {
                    setActiveSessionId(data.session_id);
                    setSessionName(data.session_name || `Session ${data.session_id.slice(0,8)}`);
                    

                  console.log("ChatInterface: useEffect for initial load/message. spaceId:", spaceId, "data.messages:", data.messages);
                    const uiMessages = (data.messages || []).map((msg, index) => ({
                  type: msg.role === 'tool_result' || msg.role === 'tool_call' ? 'toolInfo' : msg.role,
                  id: msg.db_id || `hist-${data.session_id}-${msg.timestamp || index}-${Math.random()}`, // Use DB ID if available
                  content: msg.role === 'tool_call' || msg.role === 'tool_result' ? 
                           <ToolExecutionBlock execution={{ /* ... construct execution object ... */
                               tool_name: msg.metadata?.tool_name || (msg.role === 'tool_call' ? 'Tool Call' : 'Tool Result'),
                               tool_arguments: msg.metadata?.tool_args || (msg.role === 'tool_call' ? JSON.parse(msg.content || '{}') : {}),
                               tool_output: msg.role === 'tool_result' ? JSON.parse(msg.content || '{}') : {message: "Executing..."}, // Default for tool_call
                               status: msg.metadata?.status || (msg.role === 'tool_result' ? 'success' : 'pending')
                           }} /> 
                           : msg.content,
              }));
              
              if (uiMessages.length > 0) {
                  uiMessages.push([{ ...initialAssistantMessage, id: welcomeMessageId }]);
                  setMessages(uiMessages);
              } else {
                  // No history, provide a default welcome for this existing/newly created session
                  setMessages([{
                      type: 'assistant',
                      id: `welcome-${data.session_id}-${Date.now()}`,
                      content: `Welcome to ${spaceType === 'dev' ? 'Dev' : 'Ops'} space '${sessionName}'. How can I assist?`
                  },
{ ...initialAssistantMessage, id: welcomeMessageId }
]);
              }



                    setTokenInfo(data.token_info);
                    // If history messages were returned AND we used an initialAssistantMessage, decide how to merge.
                    // For now, the initialAssistantMessage takes precedence if provided.
                } else {
                     setChatError(data.error || "Failed to initialize session after wizard.");
                }
            })
            .catch(err => setChatError(err.message || "Could not initialize session details."))
            .finally(() => setIsLoadingChat(false));

      } else {
        // No initial message from orchestrator, so fetch existing session and its history.
        console.log("ChatInterface: No initialAssistantMessage, fetching active session history.");
        fetchInitialChatDataAPI(spaceId)
          .then(data => {
            if (data && data.session_id) {
              setActiveSessionId(data.session_id);
              setSessionName(data.session_name || `Session ${data.session_id.slice(0,8)}`);
              
              const uiMessages = (data.messages || []).map((msg, index) => ({
                  type: msg.role === 'tool_result' || msg.role === 'tool_call' ? 'toolInfo' : msg.role,
                  id: msg.db_id || `hist-${data.session_id}-${msg.timestamp || index}-${Math.random()}`, // Use DB ID if available
                  content: msg.role === 'tool_call' || msg.role === 'tool_result' ? 
                           <ToolExecutionBlock execution={{ /* ... construct execution object ... */
                               tool_name: msg.metadata?.tool_name || (msg.role === 'tool_call' ? 'Tool Call' : 'Tool Result'),
                               tool_arguments: msg.metadata?.tool_args || (msg.role === 'tool_call' ? JSON.parse(msg.content || '{}') : {}),
                               tool_output: msg.role === 'tool_result' ? JSON.parse(msg.content || '{}') : {message: "Executing..."}, // Default for tool_call
                               status: msg.metadata?.status || (msg.role === 'tool_result' ? 'success' : 'pending')
                           }} /> 
                           : msg.content,
              }));
              
              if (uiMessages.length > 0) {
                  setMessages(uiMessages);
              } else {
                  // No history, provide a default welcome for this existing/newly created session
                  setMessages([{
                      type: 'assistant',
                      id: `welcome-${data.session_id}-${Date.now()}`,
                      content: `Welcome to ${spaceType === 'dev' ? 'Dev' : 'Ops'} space '${sessionName}'. How can I assist?`
                  }]);
              }
              setTokenInfo(data.token_info);
            } else {
              setChatError(data.error || "Failed to initialize chat session.");
            }
          })
          .catch(err => {
            console.error("ChatInterface: Main load error", err);
            setChatError(err.message || "Could not load chat session.");
          })
          .finally(() => {
            setIsLoadingChat(false);
          });
      }
    }
  }, [spaceId, spaceType, initialAssistantMessage]); // Rerun if these key props change


  useEffect(() => { // Scroll to bottom
    if (!isLoadingChat) { // Only scroll after initial load
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoadingChat]);



  const toggleMessageExpansion = (messageId) => {
    setExpandedMessages(prev => ({
      ...prev,
      [messageId]: !prev[messageId]
    }));
  };


  // Local add message, does not call backend (for UI updates before backend response)
  const addMessageToListLocal = (type, content, toolExecutions = null, messageId = null) => {
    const baseId = messageId || `msg-${type}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newMessagesPayload = [];
    if (content || typeof content === 'string') {
        newMessagesPayload.push({ type, content, id: baseId });
    }
    if (toolExecutions && toolExecutions.length > 0) {
        toolExecutions.forEach((exec, index) => {
            newMessagesPayload.push({ type: 'toolInfo', id: `${baseId}-tool-${index}`, content: <ToolExecutionBlock execution={exec} /> });
        });
    }
    if (newMessagesPayload.length > 0) {
        setMessages(prev => [...prev, ...newMessagesPayload]);
    }
    return baseId;
  };


  const processAndSendUserMessage = async (messageText, isToolInvocation = false, toolInvocationDetails = null) => {
    if (!messageText && !isToolInvocation) return;

    if (!activeSessionId) {
        alert("Chat session not active. Please try reloading the space.");
        return;
    }

    let userDisplayMessage = messageText;
    if (isToolInvocation && toolInvocationDetails) {
      userDisplayMessage = `Using Tool: ${toolInvocationDetails.label}`;
      // Optionally add params to display message:
      // userDisplayMessage += ` with params ${JSON.stringify(toolInvocationDetails.formData)}`;
    }
    
//    #const userMessageId = `msg-user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
//    #setMessages(prev => [...prev, { type: 'user', content: userDisplayMessage, id: userMessageId }]);
    const userMessageId = addMessageToListLocal('user', userDisplayMessage);

    if (!isToolInvocation) { // Clear input only if it was a typed message
        setInputValue('');
    }
    setIsLoading(true);
    setTokenInfo(null);

    try {
      const payload = {
        message: messageText, // The actual text prompt or tool invocation instruction
        spaceId,
        spaceType,
        sessionId: activeSessionId,
        // chat_history: messages.filter(m => m.type === 'user' || m.type === 'assistant').slice(-10), // Example history
        // ...(isToolInvocation && { tool_invocation: toolInvocationDetails }) // Optional: more structured tool info
      };
      
      console.log("Frontend: Sending to /api/chat:", payload);
      const response = await fetch('http://localhost:5001/api/chat/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      setIsLoading(false);

      if (!response.ok) {
        throw new Error(data.error || `Backend error: ${response.status}`);
      }

//      #if (data.llm_message || (data.tool_executions && data.tool_executions.length > 0)) {
//      #  addMessageToList('assistant', data.llm_message, data.tool_executions);
//      #} else if (data.error) {
//      #  addMessageToList('assistant', `Error from backend: ${data.error} ${data.details || ''}`);
//      #} else if (!data.llm_message && (!data.tool_executions || data.tool_executions.length === 0)) {
//      #  // Handle cases where backend might return success but no explicit message or tool call (e.g. silent ack)
//      #  console.warn("Received success from backend but no LLM message or tool executions.", data);
//      #  // Optionally add a generic assistant message or do nothing
//      #}
      const newAssistantMessages = [];
      if (data.llm_message || typeof data.llm_message === 'string') {
          newAssistantMessages.push({type: 'assistant', content: data.llm_message, id: `msg-assist-${Date.now()}`});
      }
      if (data.tool_executions && data.tool_executions.length > 0) {
          data.tool_executions.forEach((exec, idx) => {
              newAssistantMessages.push({type: 'toolInfo', content: <ToolExecutionBlock execution={exec} />, id: `msg-tool-${Date.now()}-${idx}`});
          });
      }
      if (newAssistantMessages.length > 0) {
          setMessages(prev => [...prev, ...newAssistantMessages]);
      }
      

      if (data.token_info) {
        setTokenInfo(data.token_info);
        console.log("Token Info:", data.token_info.message);
      }

    } catch (error) {
      console.error("Error sending/processing message:", error);
//      addMessageToList('assistant', `Sorry, I encountered an error: ${error.message}`);
      addMessageToListLocal('assistant', `Sorry, I encountered an error: ${error.message}`);
      setIsLoading(false);
    }
  };

  const handleSendMessage = (event) => {
    event.preventDefault();
    processAndSendUserMessage(inputValue.trim(), false);
  };

  const handleToolSubmission = (toolId, formData, toolLabel) => {
    // Craft a message indicating tool use for the LLM to potentially process or log
    const toolExecutionPrompt = `User initiated tool: '${toolLabel}' (ID: ${toolId}) with parameters: ${JSON.stringify(formData)}. Please proceed and provide feedback or results.`;
    processAndSendUserMessage(toolExecutionPrompt, true, { id: toolId, formData, label: toolLabel });
  };
  
  const handleInputChange = (event) => setInputValue(event.target.value);

  const isMessageContentLong = (content) => {
      if (typeof content !== 'string') return false;
      const lineCount = (content.match(/\n/g) || []).length + 1;
      return lineCount > LONG_MESSAGE_LINE_THRESHOLD || content.length > 200; // Adjust length
  };



  if (isLoadingChat) {
    return <div className="chat-interface-container loading-chat-history"><LoadingSpinner /><p>Loading conversation...</p></div>;
  }
  if (chatError) {
    return <div className="chat-interface-container error-chat-history"><p className="error-message">{chatError} <button onClick={() => {if(spaceId) fetchInitialChatDataAPI(spaceId).then( /* set states */ )}}>Retry</button></p></div>;
  }


  // Ensure the render part is correct, especially message mapping and keys
  return (
    <div className="chat-interface-container">
      {/* ... Token info bar ... */}
      {/* ... Message list mapping `messages` state ... */}
      {/* ... Loading indicator ... */}
      {/* ... ChatToolbar ... */}
      {/* ... Input form ... */}
      {isLoadingChat ? (
        <div className="chat-interface-container loading-chat-history"><LoadingSpinner /><p>Loading conversation...</p></div>
      ) : chatError ? (
        <div className="chat-interface-container error-chat-history"><p className="error-message">{chatError}</p></div>
      ) : (
        <>
          {tokenInfo && <div className="token-info-bar">{tokenInfo.message}</div>}
          <div className="message-list">
            {messages.map((msg) => (
              <div key={msg.id} className={`message ${msg.type}`}> {/* USE msg.id from state */}
                <div
                  className={`message-content ${
                    msg.type !== 'toolInfo' && typeof msg.content === 'string' && isMessageContentLong(msg.content) && !expandedMessages[msg.id] ? 'clamped' : ''
                  }`}
                  style={msg.type !== 'toolInfo' && typeof msg.content === 'string' && isMessageContentLong(msg.content) && !expandedMessages[msg.id] ? { maxHeight: MAX_INITIAL_MESSAGE_HEIGHT } : {}}
                >
                  {/* Markdown Rendering Logic */}
                  {(msg.type === 'assistant' || msg.type === 'user') && typeof msg.content === 'string' ? (
                    <ReactMarkdown
                      children={msg.content}
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeRaw, rehypeHighlight]}
                    />
                  ) : (
                    msg.content // Render directly if already JSX (ToolExecutionBlock) or non-string
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
            <input type="text" value={inputValue} onChange={handleInputChange} placeholder="Ask your DevOps assistant, or use a tool above..." disabled={isSendingMessage} />
            <button type="submit" disabled={isSendingMessage}>Send</button>
          </form>
        </>
      )}
    </div>
  );
}
export default ChatInterface;
