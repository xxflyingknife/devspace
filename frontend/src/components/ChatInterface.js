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

function ChatInterface({ spaceId, spaceType }) {
//  const [messages, setMessages] = useState([
//    // Initial message with a unique ID
//    { type: 'assistant', id: `msg-init-${Date.now()}-${Math.random()}`, content: 'Hello! How can I help you with your DevOps tasks today?' }
//  ]);

  const [messages, setMessages] = useState([
    { type: 'assistant', id: `msg-init-${Date.now()}-${Math.random()}`, content: `Hello! I am your **Vibe DevOps Assistant** for this *${spaceType}* space. How can I help you today?\n\nHere are some things I can do:\n- Execute Git commands\n- Manage Kubernetes deployments\n- Provide information based on your configured sources.\n\n\`\`\`python\n# Example code block\ndef greet():\n  print("Hello from Markdown!")\ngreet()\n\`\`\`` },
    { type: 'assistant', id: `msg-long-${Date.now()}-${Math.random()}`, content: 'This is a **longer message** that should *ideally* demonstrate the expand and collapse functionality. It needs to be significantly longer than two or three lines to really see the effect in action. Let us add even more text to ensure that the clamping and the button work as expected. The quick brown fox jumps over the lazy dog near the bank of the river with great agility and speed, showcasing its remarkable acrobatic skills for all onlookers to admire and applaud with great enthusiasm during the sunny afternoon festival.' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [tokenInfo, setTokenInfo] = useState(null);
  const messagesEndRef = useRef(null);
  const [expandedMessages, setExpandedMessages] = useState({});

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const toggleMessageExpansion = (messageId) => {
    setExpandedMessages(prev => ({
      ...prev,
      [messageId]: !prev[messageId]
    }));
  };

  const addMessageToList = (type, content, toolExecutions = null) => {
    const baseMessageId = `msg-${type}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newMessagesPayload = [];

    if (content || typeof content === 'string') { // Check if content is defined, even if empty string
        newMessagesPayload.push({ type, content, id: baseMessageId });
    }

    if (toolExecutions && toolExecutions.length > 0) {
        toolExecutions.forEach((exec, index) => {
            newMessagesPayload.push({
                type: 'toolInfo',
                id: `${baseMessageId}-tool-${index}`,
                content: <ToolExecutionBlock execution={exec} />
            });
        });
    }
    if (newMessagesPayload.length > 0) {
        setMessages(prev => [...prev, ...newMessagesPayload]);
    }
  };

  const processAndSendUserMessage = async (messageText, isToolInvocation = false, toolInvocationDetails = null) => {
    if (!messageText && !isToolInvocation) return;

    let userDisplayMessage = messageText;
    if (isToolInvocation && toolInvocationDetails) {
      userDisplayMessage = `Using Tool: ${toolInvocationDetails.label}`;
      // Optionally add params to display message:
      // userDisplayMessage += ` with params ${JSON.stringify(toolInvocationDetails.formData)}`;
    }
    
    const userMessageId = `msg-user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    setMessages(prev => [...prev, { type: 'user', content: userDisplayMessage, id: userMessageId }]);
    
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

      if (data.llm_message || (data.tool_executions && data.tool_executions.length > 0)) {
        addMessageToList('assistant', data.llm_message, data.tool_executions);
      } else if (data.error) {
        addMessageToList('assistant', `Error from backend: ${data.error} ${data.details || ''}`);
      } else if (!data.llm_message && (!data.tool_executions || data.tool_executions.length === 0)) {
        // Handle cases where backend might return success but no explicit message or tool call (e.g. silent ack)
        console.warn("Received success from backend but no LLM message or tool executions.", data);
        // Optionally add a generic assistant message or do nothing
      }

      if (data.token_info) {
        setTokenInfo(data.token_info);
        console.log("Token Info:", data.token_info.message);
      }

    } catch (error) {
      console.error("Error sending/processing message:", error);
      addMessageToList('assistant', `Sorry, I encountered an error: ${error.message}`);
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
              // Apply maxHeight for clamping only if it's a string and meets criteria
              style={msg.type !== 'toolInfo' && typeof msg.content === 'string' && isMessageContentLong(msg.content) && !expandedMessages[msg.id] ? { maxHeight: MAX_INITIAL_MESSAGE_HEIGHT } : {}}
            >
              {/* === MARKDOWN RENDERING === */}
              {msg.type === 'assistant' || msg.type === 'user' ? ( // Render user messages as MD too if desired
                typeof msg.content === 'string' ? (
                  <ReactMarkdown
                    children={msg.content}
                    remarkPlugins={[remarkGfm]} // Enable GFM (tables, etc.)
                    rehypePlugins={[rehypeRaw, rehypeHighlight]} // Enable raw HTML and syntax highlighting
                    // Optional: Custom components for rendering specific HTML elements
                    // components={{
                    //   code({node, inline, className, children, ...props}) {
                    //     const match = /language-(\w+)/.exec(className || '')
                    //     return !inline && match ? (
                    //       <SyntaxHighlighter style={atomDark} language={match[1]} PreTag="div" {...props}>
                    //         {String(children).replace(/\n$/, '')}
                    //       </SyntaxHighlighter>
                    //     ) : (
                    //       <code className={className} {...props}>
                    //         {children}
                    //       </code>
                    //     )
                    //   }
                    // }}
                  />
                ) : (
                  msg.content // Render directly if already JSX (like ToolExecutionBlock)
                )
              ) : (
                msg.content // For toolInfo or other types, render content directly (already JSX)
              )}
              {/* === END MARKDOWN RENDERING === */}
            </div>
            {msg.type !== 'toolInfo' && typeof msg.content === 'string' && isMessageContentLong(msg.content) && (
              <button
                className="expand-collapse-button"
                onClick={() => toggleMessageExpansion(msg.id)}
              >
                {expandedMessages[msg.id] ? 'Show Less ↑' : 'Show More ↓'}
              </button>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      {isLoading && <div className="typing-indicator">Assistant is thinking or tool is running...</div>}
      
      <ChatToolbar spaceType={spaceType} onToolSubmit={handleToolSubmission} spaceId={spaceId} />
      
      <form className="message-input-form" onSubmit={handleSendMessage}>
        <input 
            type="text" 
            value={inputValue} 
            onChange={handleInputChange} 
            placeholder="Ask your DevOps assistant, or use a tool above..." 
            disabled={isLoading} 
        />
        <button type="submit" disabled={isLoading}>Send</button>
      </form>
    </div>
  );
}
export default ChatInterface;



