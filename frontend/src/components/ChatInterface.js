import React, { useState, useEffect, useRef } from 'react';
import './ChatInterface.css'; // Create this CSS file

function ChatInterface({ spaceId }) { // spaceId might be used for context
  const [messages, setMessages] = useState([
      { role: 'assistant', content: 'Hello! How can I help you with your DevOps tasks today?' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null); // Ref to scroll to bottom

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleInputChange = (event) => {
    setInputValue(event.target.value);
  };

  const handleSendMessage = async (event) => {
    event.preventDefault(); // Prevent form submission reload
    const userMessage = inputValue.trim();
    if (!userMessage) return;

    // Add user message to chat
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setInputValue('');
    setIsLoading(true);

    // --- Backend Interaction ---
    // This is where you call your NEW backend service, which in turn
    // calls the LLM API (Gemini) and potentially your LangChain Agent Tools.
    try {
        console.log(`Sending to backend for space ${spaceId}: ${userMessage}`);
        // Example: Replace with your actual API call
        // const response = await fetch('/api/chat', { // Your backend endpoint
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify({ message: userMessage, spaceId: spaceId }) // Send message and context
        // });
        // if (!response.ok) {
        //   throw new Error(`HTTP error! status: ${response.status}`);
        // }
        // const data = await response.json();
        // const assistantResponse = data.reply; // Assuming backend returns { reply: "..." }

        // --- Mock Response ---
        await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate delay
        const assistantResponse = `Okay, I received "${userMessage}". I would now process this, potentially call a tool like 'git_pull' or 'k8s_get_pods' via the backend, and respond accordingly. (This is a mock response).`;
        // --- End Mock Response ---

        setMessages(prev => [...prev, { role: 'assistant', content: assistantResponse }]);

    } catch (error) {
      console.error("Error sending message:", error);
      setMessages(prev => [...prev, { role: 'assistant', content: `Sorry, I encountered an error: ${error.message}` }]);
    } finally {
      setIsLoading(false);
    }
    // --- End Backend Interaction ---
  };

  return (
    <div className="chat-interface-container">
      {/* Added Header Section */}
      <div className="chat-header-section">
        <div className="chat-title-area">
           <span className="chat-header-icon">[Icon]</span> {/* Replace with actual icon */}
           <h3 className="chat-header-title">预制和模块化建筑市场概览</h3> {/* Replace with dynamic title */}
        </div>
        <div className="chat-meta-area">
            <span>16个来源</span> {/* Replace with dynamic count */}
            <button className="chat-header-button">[保留笔记]</button>
            <button className="chat-header-button">[?]</button>
         </div>
      </div>
      {/* Original Content Starts */}
      <div className="message-list">
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.role}`}>
            <div className="message-content">{msg.content}</div>
          </div>
        ))}
        {/* Invisible element to scroll to */}
        <div ref={messagesEndRef} />
      </div>
      {isLoading && <div className="typing-indicator">Assistant is thinking...</div>}
      <form className="message-input-form" onSubmit={handleSendMessage}>
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          placeholder="Ask your DevOps assistant..."
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading}>Send</button>
      </form>
    </div>
  );
}

export default ChatInterface;
