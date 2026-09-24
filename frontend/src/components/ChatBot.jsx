import { useState } from 'react';
import ChatMessage from './ChatMessage';
import api from '../services/api';
import aiHeadImage from '../assets/ai-head.svg';

const welcomeMessage = {
  sender: 'bot',
  text: 'Hello! How can I help you?',
  time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
};

function ChatBot() {
  const [messages, setMessages] = useState([welcomeMessage]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([
    "Show today's company summary",
    'Find employees with React skills',
    'Give me an IT department summary',
    'How many employees are in Chennai?',
  ]);

  const sendMessage = async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput || loading) return;

    const userMessage = {
      sender: 'user',
      text: trimmedInput,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await api.post('/chat', { message: trimmedInput });
      const botReply = {
        sender: 'bot',
        text: response.data.reply || 'No response from the chatbot.',
        employees: response.data.employees || [],
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botReply]);
      setSuggestions(response.data.suggestions || suggestions);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: 'Unable to connect to the server. Please make sure the Node.js backend is running.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className={`chatbot-card ai-shell ${messages.length > 1 ? 'has-conversation' : ''}`}>
      <div className="chatbot-header ai-header">
        <div className="ai-title-wrap">
          <div className="ai-badge" aria-hidden="true">◆</div>
          <div>
            <p className="ai-label">Employee intelligence</p>
            <h2>Employee AI Assistant</h2>
          </div>
        </div>

        <button
          className="clear-chat-btn"
          onClick={() => setMessages([welcomeMessage])}
          type="button"
        >
          New chat
        </button>
      </div>

      <div className="chatbot-body ai-body" aria-live="polite" aria-busy={loading}>
        {messages.length === 1 && (
          <div className="ai-welcome">
            <img className="welcome-image" src={aiHeadImage} alt="AI assistant" />
            <h1>Hi, I&apos;m Employee AI.</h1>
            <p>How can I help you today?</p>
          </div>
        )}

        {messages.map((message, index) => (
          messages.length === 1 && index === 0 ? null : (
            <ChatMessage key={`${message.sender}-${index}`} message={message} />
          )
        ))}

        {loading && (
          <div className="chat-row bot">
            <div className="message-bubble bot typing-bubble">
              <span className="typing-dots">
                <i />
                <i />
                <i />
              </span>
              <span>Bot is thinking...</span>
            </div>
          </div>
        )}

        {messages.length === 1 && !loading && (
          <div className="suggested-prompts">
            <p>Try asking</p>
            <div>
              {suggestions.map((suggestion) => (
                <button key={suggestion} type="button" onClick={() => { setInput(suggestion); }}>
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="chat-input-row ai-input-row">
        <div className="composer-main">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message Employee AI"
            aria-label="Type your message"
          />
          <div className="composer-tools">
            <button className="composer-chip active" type="button">Employee AI</button>
            <button className="composer-chip" type="button">◉ Search</button>
          </div>
        </div>
        <button onClick={sendMessage} type="button" className="send-btn" aria-label="Send message" disabled={!input.trim() || loading}>
          ↑
        </button>
      </div>
    </div>
  );
}

export default ChatBot;
