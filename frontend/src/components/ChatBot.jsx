import { useState } from 'react';
import ChatMessage from './ChatMessage';
import api from '../services/api';
import aiHeadImage from '../assets/employee-assistant-logo.svg';
import { useAuth } from '../context/AuthContext';

const roleSuggestions = {
  ADMIN: ['Show all employees', 'Show IT employees', 'Find employees with React skills', 'How many employees are in HR?', 'Who has not checked in today?', 'Show HR department attendance'],
  HR: ['Show all employees', 'Show Non-IT employees', 'Find an employee by name', 'How many employees are in IT?', 'Who has not checked in today?', 'Show HR department attendance'],
  EMPLOYEE: ['Show my profile', 'What is my attendance today?', 'How many hours did I work today?', 'What is my attendance percentage?', 'Check in now'],
};

const getTime = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

function ChatBot() {
  const { user } = useAuth();
  const suggestionsForUser = roleSuggestions[user?.role] || roleSuggestions.EMPLOYEE;
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState(suggestionsForUser);

  const cancelAttendanceAction = (messageIndex) => {
    setMessages((previous) => previous.map((message, index) => (
      index === messageIndex
        ? { ...message, attendanceAction: null, text: 'Attendance action cancelled.' }
        : message
    )));
  };

  const sendMessage = async (messageText = input, confirmAction = undefined) => {
    const trimmedInput = messageText.trim();
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
      const response = await api.post('/chat', {
        message: trimmedInput,
        ...(confirmAction ? { confirmAction } : {}),
      });
      const botReply = {
        sender: 'bot',
        text: response.data.reply || 'No response from the chatbot.',
        employees: response.data.employees || [],
        stats: response.data.stats || [],
        total: response.data.total,
        hasMore: response.data.hasMore,
        directoryUrl: response.data.directoryUrl,
        attendanceUrl: response.data.attendanceUrl,
        attendanceAction: response.data.attendanceAction,
        attendanceSummary: response.data.attendanceSummary,
        suggestions: response.data.suggestions || suggestionsForUser,
        time: getTime(),
      };

      setMessages((prev) => [...prev, botReply]);
      setSuggestions(response.data.suggestions || suggestionsForUser);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: error.response?.data?.message || 'Unable to connect to the server. Please try again.',
          suggestions: suggestionsForUser,
          time: getTime(),
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
          <div className="ai-badge" aria-hidden="true"><img src={aiHeadImage} alt="" /></div>
          <div>
            <p className="ai-label">EMPLOYEE INTELLIGENCE</p>
            <h2>Employee AI Assistant</h2>
          </div>
        </div>

        <div className="chatbot-header-actions">
          <span className="assistant-live"><i /> Directory online</span>
        <button
          className="clear-chat-btn"
          onClick={() => { setMessages([]); setInput(''); setSuggestions(suggestionsForUser); }}
          type="button"
        >
          <span aria-hidden="true">＋</span> New chat
        </button>
        </div>
      </div>

      <div className={`chatbot-body ai-body${messages.length === 0 ? ' is-welcome' : ''}`} aria-live="polite" aria-busy={loading}>
        {messages.length === 0 && (
          <div className="welcome-screen">
            <div className="ai-welcome">
              <div className="welcome-art-wrap">
                <span className="welcome-orbit welcome-orbit-one" />
                <span className="welcome-orbit welcome-orbit-two" />
                <img className="welcome-image" src={aiHeadImage} alt="" />
                <span className="welcome-art-status" aria-hidden="true"><i /></span>
              </div>
              <p className="welcome-eyebrow">YOUR WORKFORCE, WITHIN REACH</p>
              <h1>Meet your people<br /><span>intelligence assistant.</span></h1>
              <p className="welcome-description">Find teammates, explore departments, and match skills with one simple question.</p>
              <div className="welcome-capabilities" aria-label="Available capabilities">
                <span><i>⌕</i> People search</span>
                <span><i>▦</i> Team insights</span>
                <span><i>✳</i> Skill matching</span>
              </div>
            </div>

            <div className="suggested-prompts">
              <div className="suggested-prompts-heading">
                <div><span>QUICK START</span><strong>What can I help you find?</strong></div>
                <span className="prompt-sparkle" aria-hidden="true">✦</span>
              </div>
              <div className="suggested-prompt-list">
                {suggestions.map((suggestion, index) => (
                  <button key={suggestion} type="button" onClick={() => sendMessage(suggestion)}>
                    <span className="prompt-number">0{index + 1}</span>
                    <span>{suggestion}</span>
                    <span className="prompt-arrow" aria-hidden="true">↗</span>
                  </button>
                ))}
              </div>
              <p className="prompt-privacy-note"><i aria-hidden="true">✓</i> Answers respect your role permissions</p>
            </div>
          </div>
        )}

        {messages.map((message, index) => (
          <ChatMessage
            key={`${message.sender}-${index}`}
            message={message}
            messageIndex={index}
            onSuggestion={sendMessage}
            onConfirmAttendance={(action) => sendMessage(`Confirm ${action === 'CHECK_IN' ? 'check-in' : 'check-out'}`, action)}
            onCancelAttendance={cancelAttendanceAction}
          />
        ))}

        {loading && (
          <div className="chat-row bot">
            <div className="message-bubble bot typing-bubble">
              <span className="typing-dots">
                <i />
                <i />
                <i />
              </span>
              <span>Searching your employee directory...</span>
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
            placeholder="Ask about employees, teams, roles, or skills..."
            aria-label="Type your message"
            maxLength={500}
          />
          <div className="composer-tools">
            <span className="composer-chip active">Employee directory</span>
            <span className="composer-chip">{user?.role || 'Employee'}</span>
            <span className="composer-hint">{input.length}/500 · Enter to send</span>
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
