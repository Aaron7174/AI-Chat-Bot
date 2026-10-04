import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

const groupConversations = (conversations) => {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  const sevenDaysAgo = new Date(startOfToday);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const thirtyDaysAgo = new Date(startOfToday);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const groups = [
    { label: 'Today', conversations: [] },
    { label: 'Yesterday', conversations: [] },
    { label: 'Previous 7 days', conversations: [] },
    { label: 'Previous 30 days', conversations: [] },
    { label: 'Older', conversations: [] },
  ];

  conversations.forEach((conversation) => {
    const updatedAt = new Date(conversation.updatedAt);
    const groupIndex = updatedAt >= startOfToday
      ? 0
      : updatedAt >= startOfYesterday
        ? 1
        : updatedAt >= sevenDaysAgo
          ? 2
          : updatedAt >= thirtyDaysAgo
            ? 3
            : 4;
    groups[groupIndex].conversations.push(conversation);
  });

  return groups.filter((group) => group.conversations.length > 0);
};

function ChatBot() {
  const { user, hasPermission } = useAuth();
  const navigate = useNavigate();
  const suggestionsForUser = (roleSuggestions[user?.role] || roleSuggestions.EMPLOYEE).filter((suggestion) => {
    const normalized = suggestion.toLowerCase();
    if (/who has not checked in|department attendance/.test(normalized)) {
      return hasPermission('VIEW_ATTENDANCE');
    }
    if (/attendance|check in|work today/.test(normalized)) {
      return hasPermission('VIEW_ATTENDANCE') || hasPermission('VIEW_OWN_ATTENDANCE');
    }
    if (/employee|department|skills/.test(normalized)) {
      return hasPermission('VIEW_EMPLOYEES');
    }
    return true;
  });
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState(suggestionsForUser);
  const [activePromptIndex, setActivePromptIndex] = useState(-1);
  const [conversations, setConversations] = useState([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [hasMoreHistory, setHasMoreHistory] = useState(false);
  const [historyAvailable, setHistoryAvailable] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [renameConversationId, setRenameConversationId] = useState(null);
  const [renameTitle, setRenameTitle] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState('');
  const commandButtonRef = useRef(null);
  const commandPaletteRef = useRef(null);
  const commandSearchRef = useRef(null);
  const inputRef = useRef(null);
  const normalizedInput = input.trim().toLowerCase();
  const promptSuggestions = normalizedInput.length >= 2
    ? suggestionsForUser
      .filter((prompt) => normalizedInput.split(/\s+/).every((term) => prompt.toLowerCase().includes(term)))
      .slice(0, 4)
    : [];
  const conversationGroups = groupConversations(conversations);
  const greeting = new Date().getHours() < 12
    ? 'Good morning'
    : new Date().getHours() < 18
      ? 'Good afternoon'
      : 'Good evening';
  const firstName = user?.name?.trim().split(/\s+/)[0];

  useEffect(() => {
    const handleShortcut = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        if (isPaletteOpen) setCommandQuery('');
        setIsPaletteOpen(!isPaletteOpen);
      } else if (event.key === 'Escape' && isPaletteOpen) {
        setCommandQuery('');
        setIsPaletteOpen(false);
      }
    };

    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, [isPaletteOpen]);

  useEffect(() => {
    if (isPaletteOpen) {
      commandSearchRef.current?.focus();
    }
  }, [isPaletteOpen]);

  useEffect(() => {
    const loadConversations = async () => {
      try {
        const response = await api.get('/chat/conversations');
        setConversations(response.data.conversations || []);
        setHistoryPage(1);
        setHasMoreHistory(Boolean(response.data.nextPage));
        setHistoryAvailable(true);
      } catch {
        setHistoryAvailable(false);
      }
    };
    loadConversations();
  }, []);

  const refreshConversations = async (search = historySearch, page = 1, append = false) => {
    try {
      const response = await api.get('/chat/conversations', {
        params: {
          ...(search.trim() ? { search: search.trim() } : {}),
          ...(page > 1 ? { page } : {}),
        },
      });
      setConversations((previous) => append
        ? [...previous, ...(response.data.conversations || [])]
        : response.data.conversations || []);
      setHistoryPage(page);
      setHasMoreHistory(Boolean(response.data.nextPage));
      setHistoryAvailable(true);
    } catch {
      setHistoryAvailable(false);
      setIsHistoryOpen(false);
    }
  };

  const createSavedConversation = async () => {
    const response = await api.post('/chat/conversations');
    const conversation = response.data.conversation;
    setActiveConversationId(conversation.id);
    setMessages([]);
    setInput('');
    setSuggestions(suggestionsForUser);
    setHistoryAvailable(true);
    setConversations((previous) => [conversation, ...previous.filter((item) => item.id !== conversation.id)]);
    return conversation.id;
  };

  const startNewConversation = async () => {
    setActiveConversationId(null);
    setMessages([]);
    setInput('');
    setSuggestions(suggestionsForUser);
    setIsHistoryOpen(false);
    if (historyAvailable) {
      try {
        await createSavedConversation();
      } catch {
        setHistoryAvailable(false);
      }
    }
  };

  const openConversation = async (conversationId) => {
    try {
      const response = await api.get(`/chat/conversations/${conversationId}`);
      const conversation = response.data.conversation;
      setActiveConversationId(conversation.id);
      setMessages(conversation.messages || []);
      const lastAssistantMessage = [...(conversation.messages || [])].reverse().find((message) => message.sender === 'bot');
      setSuggestions(lastAssistantMessage?.suggestions || suggestionsForUser);
      setInput('');
      setIsHistoryOpen(false);
    } catch {
      setHistoryAvailable(false);
      setIsHistoryOpen(false);
    }
  };

  const saveConversationTitle = async (conversationId) => {
    try {
      const response = await api.patch(`/chat/conversations/${conversationId}`, { title: renameTitle });
      setConversations((previous) => previous.map((conversation) => (
        conversation.id === conversationId
          ? { ...conversation, ...response.data.conversation }
          : conversation
      )));
      setRenameConversationId(null);
      setRenameTitle('');
    } catch {
      setHistoryAvailable(false);
      setIsHistoryOpen(false);
    }
  };

  const removeConversation = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/chat/conversations/${deleteTarget.id}`);
      setConversations((previous) => previous.filter((conversation) => conversation.id !== deleteTarget.id));
      if (activeConversationId === deleteTarget.id) {
        setActiveConversationId(null);
        setMessages([]);
        setSuggestions(suggestionsForUser);
      }
      setDeleteTarget(null);
    } catch {
      setHistoryAvailable(false);
      setIsHistoryOpen(false);
    }
  };

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
    setActivePromptIndex(-1);
    setLoading(true);

    try {
      let conversationId = activeConversationId;
      if (!conversationId && historyAvailable) {
        try {
          conversationId = await createSavedConversation();
        } catch {
          setHistoryAvailable(false);
        }
      }
      const requestBody = {
        message: trimmedInput,
        ...(confirmAction ? { confirmAction } : {}),
      };
      let response;
      if (conversationId) {
        try {
          response = await api.post(`/chat/conversations/${conversationId}/messages`, requestBody);
        } catch (error) {
          if (confirmAction) throw error;
          setHistoryAvailable(false);
          setActiveConversationId(null);
          setIsHistoryOpen(false);
          response = await api.post('/chat', requestBody);
        }
      } else {
        response = await api.post('/chat', requestBody);
      }
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
      if (conversationId && historyAvailable) await refreshConversations();
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: "I couldn't reach the chat service. Please check the connection and try again.",
          suggestions: suggestionsForUser,
          time: getTime(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'ArrowDown' && promptSuggestions.length > 0) {
      event.preventDefault();
      setActivePromptIndex((index) => (index + 1) % promptSuggestions.length);
      return;
    }

    if (event.key === 'ArrowUp' && promptSuggestions.length > 0) {
      event.preventDefault();
      setActivePromptIndex((index) => (index <= 0 ? promptSuggestions.length - 1 : index - 1));
      return;
    }

    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (activePromptIndex >= 0 && promptSuggestions[activePromptIndex]) {
        setInput(promptSuggestions[activePromptIndex]);
        setActivePromptIndex(-1);
        return;
      }
      sendMessage();
    }
  };

  const selectPromptSuggestion = (prompt) => {
    setInput(prompt);
    setActivePromptIndex(-1);
    inputRef.current?.focus();
  };

  const commands = [
    {
      label: 'Start a new chat',
      description: 'Clear this conversation and begin again',
      icon: '+',
      action: startNewConversation,
    },
    { label: 'Open dashboard', description: 'Go to your workspace overview', icon: '⌂', path: '/' },
    ...(hasPermission('VIEW_EMPLOYEES')
      ? [{ label: 'Open employees', description: 'Browse the employee directory', icon: '◉', path: '/employees' }]
      : []),
    ...(hasPermission('VIEW_ATTENDANCE') || hasPermission('VIEW_OWN_ATTENDANCE')
      ? [{ label: 'Open attendance', description: 'View attendance records available to you', icon: '◷', path: '/attendance' }]
      : []),
    ...(hasPermission('VIEW_ANALYTICS')
      ? [{ label: 'Open analytics', description: 'View available workforce analytics', icon: '▥', path: '/analytics' }]
      : []),
    ...suggestionsForUser.slice(0, 4).map((prompt) => ({
      label: prompt,
      description: 'Ask Employee AI',
      icon: '✦',
      prompt,
    })),
  ];
  const filteredCommands = commands.filter((command) => (
    `${command.label} ${command.description}`.toLowerCase().includes(commandQuery.trim().toLowerCase())
  ));

  const runCommand = (command) => {
    setCommandQuery('');
    setIsPaletteOpen(false);
    if (command.path) {
      navigate(command.path);
    } else if (command.prompt) {
      sendMessage(command.prompt);
    } else {
      command.action();
    }
  };

  return (
    <div
      className={`chatbot-card ai-shell ${messages.length > 1 ? 'has-conversation' : ''}`}
      data-ai-state={loading ? 'thinking' : 'idle'}
    >
      <div className="chatbot-header ai-header">
        <div className="ai-title-wrap">
          <div className="ai-badge" aria-hidden="true"><img src={aiHeadImage} alt="" /></div>
          <div>
            <h2>Employee Assistant</h2>
          </div>
        </div>

        <div className="chatbot-header-actions">
          {historyAvailable && (
            <button
              className="history-trigger"
              type="button"
              onClick={() => {
                setIsHistoryOpen((isOpen) => !isOpen);
                refreshConversations(historySearch, 1);
              }}
              aria-expanded={isHistoryOpen}
              aria-controls="conversation-history"
            >
              History
            </button>
          )}
          <button
            ref={commandButtonRef}
            className="command-trigger"
            onClick={() => setIsPaletteOpen(true)}
            type="button"
            aria-haspopup="dialog"
            aria-expanded={isPaletteOpen}
            aria-keyshortcuts="Control+K Meta+K"
          >
            <span>Commands</span><kbd>Ctrl K</kbd>
          </button>
          <button
            className="clear-chat-btn"
            onClick={startNewConversation}
            type="button"
          >
            <span aria-hidden="true">＋</span> New chat
          </button>
        </div>
      </div>

      {historyAvailable && isHistoryOpen && (
        <div className="conversation-history-overlay" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setIsHistoryOpen(false);
        }}>
          <section
            className="conversation-history-panel"
            id="conversation-history"
            aria-label="Conversation history"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header className="conversation-history-header">
              <div>
                <h3>Conversation history</h3>
                <p>Your chats are private to your account.</p>
              </div>
              <button type="button" onClick={() => setIsHistoryOpen(false)} aria-label="Close history">×</button>
            </header>
            <form className="conversation-search" onSubmit={(event) => {
              event.preventDefault();
              refreshConversations(historySearch, 1);
            }}>
              <input
                value={historySearch}
                onChange={(event) => setHistorySearch(event.target.value)}
                placeholder="Search conversations"
                aria-label="Search conversations"
                maxLength={100}
              />
              <button type="submit">Search</button>
            </form>
            <div className="conversation-history-list">
              {conversationGroups.map((group) => (
                <section className="conversation-history-group" key={group.label}>
                  <h4>{group.label}</h4>
                  {group.conversations.map((conversation) => (
                    <article
                      className={`conversation-history-item${activeConversationId === conversation.id ? ' active' : ''}`}
                      key={conversation.id}
                    >
                      {renameConversationId === conversation.id ? (
                        <form className="conversation-rename-form" onSubmit={(event) => {
                          event.preventDefault();
                          saveConversationTitle(conversation.id);
                        }}>
                          <input
                            autoFocus
                            value={renameTitle}
                            onChange={(event) => setRenameTitle(event.target.value)}
                            aria-label="Conversation title"
                            maxLength={80}
                          />
                          <button type="submit" disabled={!renameTitle.trim()}>Save</button>
                          <button type="button" onClick={() => setRenameConversationId(null)}>Cancel</button>
                        </form>
                      ) : (
                        <>
                          <button
                            className="conversation-open-button"
                            type="button"
                            onClick={() => openConversation(conversation.id)}
                          >
                            <strong>{conversation.title}</strong>
                            <span>{conversation.preview}</span>
                            <time dateTime={conversation.updatedAt}>
                              {new Date(conversation.updatedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                            </time>
                          </button>
                          <div className="conversation-history-actions">
                            <button
                              type="button"
                              onClick={() => {
                                setRenameConversationId(conversation.id);
                                setRenameTitle(conversation.title);
                              }}
                              aria-label={`Rename ${conversation.title}`}
                            >
                              Rename
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(conversation)}
                              aria-label={`Delete ${conversation.title}`}
                            >
                              Delete
                            </button>
                          </div>
                        </>
                      )}
                    </article>
                  ))}
                </section>
              ))}
              {conversationGroups.length === 0 && (
                <p className="conversation-history-empty">No saved conversations yet.</p>
              )}
              {hasMoreHistory && (
                <button
                  className="conversation-load-more"
                  type="button"
                  onClick={() => refreshConversations(historySearch, historyPage + 1, true)}
                >
                  Load older conversations
                </button>
              )}
            </div>
            {deleteTarget && (
              <div className="conversation-delete-backdrop">
                <section className="conversation-delete-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-conversation-title">
                  <h3 id="delete-conversation-title">Delete conversation?</h3>
                  <p>“{deleteTarget.title}” and its messages will be removed.</p>
                  <div>
                    <button type="button" onClick={() => setDeleteTarget(null)}>Cancel</button>
                    <button type="button" onClick={removeConversation}>Delete</button>
                  </div>
                </section>
              </div>
            )}
          </section>
        </div>
      )}

      <div className={`chatbot-body ai-body${messages.length === 0 ? ' is-welcome' : ''}`} aria-live="polite" aria-busy={loading}>
        {messages.length === 0 && (
          <div className="welcome-screen command-welcome">
            <div className="ai-welcome">
              <div className="welcome-art-wrap">
                <span className="welcome-orbit welcome-orbit-one" />
                <span className="welcome-orbit welcome-orbit-two" />
                <span className="welcome-core-aura" />
                <img className="welcome-image" src={aiHeadImage} alt="" />
                <span className="welcome-core-node" aria-hidden="true" />
              </div>
              <h1>{greeting}{firstName ? `, ${firstName}` : ''}<br /><span>What would you like to do?</span></h1>
            </div>

            <div className="suggested-prompts">
              <div className="suggested-prompts-heading">
                <div><strong>Try asking</strong></div>
              </div>
              <div className="suggested-prompt-list">
                {suggestions.slice(0, 4).map((suggestion) => (
                  <button key={suggestion} type="button" onClick={() => sendMessage(suggestion)}>
                    <span>{suggestion}</span>
                  </button>
                ))}
              </div>
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
              <span>Working on your request…</span>
            </div>
          </div>
        )}

      </div>

      <div className="chat-input-row ai-input-row">
        <div className="composer-main">
          <textarea
            ref={inputRef}
            rows={2}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setActivePromptIndex(-1);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Message Employee Assistant..."
            aria-label="Type your message"
            aria-autocomplete="list"
            aria-controls={promptSuggestions.length > 0 ? 'chat-prompt-suggestions' : undefined}
            aria-activedescendant={activePromptIndex >= 0 ? `chat-prompt-suggestion-${activePromptIndex}` : undefined}
            aria-expanded={promptSuggestions.length > 0}
            maxLength={500}
          />
          {promptSuggestions.length > 0 && (
            <div className="chat-prompt-suggestions" id="chat-prompt-suggestions" role="listbox" aria-label="Suggested prompts">
              {promptSuggestions.map((prompt, index) => (
                <button
                  className={index === activePromptIndex ? 'active' : ''}
                  id={`chat-prompt-suggestion-${index}`}
                  key={prompt}
                  type="button"
                  role="option"
                  aria-selected={index === activePromptIndex}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectPromptSuggestion(prompt)}
                >
                  <span aria-hidden="true">✦</span>
                  {prompt}
                </button>
              ))}
              <span className="chat-prompt-hint">Use ↑ ↓ to choose · Enter to fill</span>
            </div>
          )}
        </div>
        <button onClick={sendMessage} type="button" className="send-btn" aria-label="Send message" disabled={!input.trim() || loading}>
          ↑
        </button>
      </div>

      {isPaletteOpen && (
        <div className="command-overlay" onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            setCommandQuery('');
            setIsPaletteOpen(false);
          }
        }}>
          <section
            ref={commandPaletteRef}
            className="command-palette"
            role="dialog"
            aria-modal="true"
            aria-labelledby="command-palette-title"
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.stopPropagation();
                setCommandQuery('');
                setIsPaletteOpen(false);
                commandButtonRef.current?.focus();
              } else if (event.key === 'Tab') {
                const focusable = Array.from(commandPaletteRef.current?.querySelectorAll('button:not([disabled]), input:not([disabled])') || []);
                const first = focusable[0];
                const last = focusable[focusable.length - 1];
                const activeElement = event.currentTarget.ownerDocument.activeElement;
                if (event.shiftKey && activeElement === first) {
                  event.preventDefault();
                  last?.focus();
                } else if (!event.shiftKey && activeElement === last) {
                  event.preventDefault();
                  first?.focus();
                }
              }
            }}
          >
            <div className="command-search-row">
              <span className="command-search-icon" aria-hidden="true">⌕</span>
              <input
                ref={commandSearchRef}
                value={commandQuery}
                onChange={(event) => setCommandQuery(event.target.value)}
                placeholder="Search commands or ask a question…"
                aria-label="Search commands"
              />
              <button type="button" onClick={() => {
                setCommandQuery('');
                setIsPaletteOpen(false);
                commandButtonRef.current?.focus();
              }} aria-label="Close commands">Esc</button>
            </div>
            <div className="command-results">
              <h3 id="command-palette-title">COMMAND CENTER</h3>
              {filteredCommands.length > 0 ? filteredCommands.map((command) => (
                <button
                  className="command-result"
                  key={`${command.label}-${command.path || command.prompt || 'action'}`}
                  type="button"
                  onClick={() => runCommand(command)}
                >
                  <span className="command-result-icon" aria-hidden="true">{command.icon}</span>
                  <span className="command-result-copy">
                    <strong>{command.label}</strong>
                    <small>{command.description}</small>
                  </span>
                  <span className="command-result-arrow" aria-hidden="true">↗</span>
                </button>
              )) : (
                <p className="command-empty-state">No supported commands match that search.</p>
              )}
            </div>
            <footer className="command-palette-footer">
              <span>Available actions respect your account permissions.</span>
              <span><kbd>Esc</kbd> Close</span>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}

export default ChatBot;
