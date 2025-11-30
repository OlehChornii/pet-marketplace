// client/src/components/ChatBot.jsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';

const ChatWindow = ({ onClose }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isMinimized] = useState(false);
  const [sessionId] = useState(() =>
    `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  );
  const messagesEndRef = useRef(null);
  const token = localStorage.getItem('token');

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (messages.length === 0) {
      setTimeout(() => {
        setMessages([{
          id: 'welcome',
          text: 'Привіт! 👋 Я твій віртуальний асистент **PetMarket**. Чим можу допомогти?',
          sender: 'bot',
          timestamp: new Date()
        }]);
      }, 500);
    }
  }, [messages.length]);

  const handleSendMessage = async (e) => {
    e?.preventDefault();

    if (!input.trim() || loading) return;

    const userMsg = {
      id: Date.now(),
      text: input,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/chat/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: input,
          sessionId
        })
      });

      if (!response.ok) throw new Error('Помилка сервера');

      const data = await response.json();

      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        text: data.message,
        sender: 'bot',
        timestamp: new Date(),
        classification: data.classification
      }]);
    } catch (error) {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        text: `Вибачте, виникла помилка. Спробуйте пізніше або зв'яжіться з підтримкою.`,
        sender: 'bot',
        timestamp: new Date(),
        isError: true
      }]);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    { emoji: '🐕', text: 'Собаки', query: 'Розкажи про собак' },
    { emoji: '🐈', text: 'Коти', query: 'Розкажи про котів' },
    { emoji: '💙', text: 'Всиновлення', query: 'Як всиновити тварину?' },
    { emoji: '💊', text: 'Догляд', query: 'Поради з догляду' }
  ];

  const handleQuickAction = (query) => {
    setInput(query);
  };

  return (
    <div style={styles.container}>
      <style>
        {`
          @keyframes slideIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes typing {
            0%, 60%, 100% { transform: translateY(0); }
            30% { transform: translateY(-6px); }
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          
          .markdown-content p {
            margin: 0.5rem 0;
          }
          .markdown-content p:first-child {
            margin-top: 0;
          }
          .markdown-content p:last-child {
            margin-bottom: 0;
          }
          .markdown-content strong {
            font-weight: 700;
            color: inherit;
          }
          .markdown-content em {
            font-style: italic;
          }
          .markdown-content code {
            background-color: rgba(0, 0, 0, 0.05);
            padding: 0.2rem 0.4rem;
            border-radius: 4px;
            font-family: 'Courier New', monospace;
            font-size: 0.85em;
          }
          .markdown-content pre {
            background-color: rgba(0, 0, 0, 0.05);
            padding: 0.75rem;
            border-radius: 8px;
            overflow-x: auto;
            margin: 0.5rem 0;
          }
          .markdown-content pre code {
            background-color: transparent;
            padding: 0;
          }
          .markdown-content ul, .markdown-content ol {
            margin: 0.5rem 0;
            padding-left: 1.5rem;
          }
          .markdown-content li {
            margin: 0.25rem 0;
          }
          .markdown-content h1, .markdown-content h2, .markdown-content h3 {
            margin: 0.75rem 0 0.5rem 0;
            font-weight: 700;
          }
          .markdown-content h1 {
            font-size: 1.25em;
          }
          .markdown-content h2 {
            font-size: 1.15em;
          }
          .markdown-content h3 {
            font-size: 1.05em;
          }
          .markdown-content a {
            color: #609966;
            text-decoration: underline;
          }
          .markdown-content blockquote {
            border-left: 3px solid #9DC08B;
            padding-left: 0.75rem;
            margin: 0.5rem 0;
            color: rgba(0, 0, 0, 0.7);
          }
          .markdown-content table {
            border-collapse: collapse;
            width: 100%;
            margin: 0.5rem 0;
          }
          .markdown-content th, .markdown-content td {
            border: 1px solid rgba(0, 0, 0, 0.1);
            padding: 0.5rem;
            text-align: left;
          }
          .markdown-content th {
            background-color: rgba(0, 0, 0, 0.05);
            font-weight: 700;
          }
        `}
      </style>

      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.avatar}>🐾</div>
          <div style={styles.headerInfo}>
            <h3 style={styles.headerTitle}>Pet Assistant</h3>
            <span style={styles.status}>
              <span style={styles.statusDot}></span>
              Онлайн
            </span>
          </div>
        </div>
        <div style={styles.headerActions}>
          <button 
            onClick={onClose} 
            style={styles.closeButton}
            title="Закрити"
          >
            ✕
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          <div style={styles.messages}>
            {messages.map(msg => (
              <div
                key={msg.id}
                style={{
                  ...styles.message,
                  ...(msg.sender === 'user' ? styles.userMessage : styles.botMessage)
                }}
              >
                {msg.sender === 'bot' && (
                  <div style={styles.botAvatar}>🤖</div>
                )}
                
                <div style={styles.messageContent}>
                  <div style={{
                    ...styles.messageBubble,
                    ...(msg.sender === 'user' ? styles.userBubble : styles.botBubble),
                    ...(msg.isError ? styles.errorBubble : {})
                  }}>
                    {msg.sender === 'bot' ? (
                      <div className="markdown-content" style={styles.messageText}>
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          rehypePlugins={[rehypeSanitize]}
                        >
                          {msg.text}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <span style={styles.messageText}>{msg.text}</span>
                    )}
                  </div>
                  
                  <span style={{
                    ...styles.time,
                    ...(msg.sender === 'user' ? styles.userTime : styles.botTime)
                  }}>
                    {msg.timestamp.toLocaleTimeString('uk-UA', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>

                {msg.sender === 'user' && (
                  <div style={styles.userAvatar}>👤</div>
                )}
              </div>
            ))}

            {loading && (
              <div style={{ ...styles.message, ...styles.botMessage }}>
                <div style={styles.botAvatar}>🤖</div>
                <div style={styles.typingIndicator}>
                  <span style={styles.typingDot}></span>
                  <span style={{ ...styles.typingDot, animationDelay: '0.2s' }}></span>
                  <span style={{ ...styles.typingDot, animationDelay: '0.4s' }}></span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {messages.length <= 1 && !loading && (
            <div style={styles.quickActions}>
              <p style={styles.quickActionsLabel}>Швидкі запити:</p>
              <div style={styles.quickActionButtons}>
                {quickActions.map((action, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleQuickAction(action.query)}
                    style={styles.quickActionBtn}
                  >
                    <span style={styles.quickActionEmoji}>{action.emoji}</span>
                    {action.text}
                  </button>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleSendMessage} style={styles.form}>
            <div style={styles.inputWrapper}>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Напишіть повідомлення..."
                disabled={loading}
                style={styles.input}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                style={{
                  ...styles.sendButton,
                  ...(loading || !input.trim() ? styles.sendButtonDisabled : {})
                }}
              >
                {loading ? (
                  <span style={styles.loadingSpinner}>⏳</span>
                ) : (
                  <span style={styles.sendIcon}>➤</span>
                )}
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
};

export const ChatBotLauncher = ({ user }) => {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const isAllowedRoute = useCallback((pathname) => {
    const allowedPrefixes = ['/', '/dogs', '/cats', '/others', '/adopt', '/adoptions', '/shelters'];
    if (pathname === '/') return true;
    return allowedPrefixes.some(pref => pref !== '/' && pathname.startsWith(pref));
  }, []);

  useEffect(() => {
    if (!isAllowedRoute(location.pathname)) {
      setOpen(false);
    }
  }, [location.pathname, isAllowedRoute]);

  useEffect(() => {
    if (!user) setOpen(false);
  }, [user]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!open && user && isAllowedRoute(location.pathname)) {
        setShowTooltip(true);
        setTimeout(() => setShowTooltip(false), 5000);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [open, user, location.pathname, isAllowedRoute]);

  if (!user || !isAllowedRoute(location.pathname)) return null;

  return (
    <div style={launcherStyles.wrapper}>
      {open ? (
        <div style={launcherStyles.openContainer}>
          <ChatWindow onClose={() => setOpen(false)} />
        </div>
      ) : (
        <>
          {showTooltip && (
            <div style={launcherStyles.tooltip}>
              Потрібна допомога? 💬
            </div>
          )}
          <button
            onClick={() => setOpen(true)}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            style={launcherStyles.fab}
            title="Відкрити чат-асистент"
          >
            <span style={launcherStyles.fabIcon}>💬</span>
            <span style={launcherStyles.notificationBadge}>1</span>
          </button>
        </>
      )}
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    background: '#fff',
    borderRadius: '16px',
    overflow: 'hidden',
    boxShadow: '0 10px 40px rgba(64, 81, 59, 0.15)',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },

  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 1.25rem',
    background: 'linear-gradient(135deg, #609966 0%, #40513B 100%)',
    color: '#fff',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.5rem',
  },
  headerInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.2rem',
  },
  headerTitle: {
    margin: 0,
    fontSize: '1rem',
    fontWeight: '700',
  },
  status: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    fontSize: '0.75rem',
    opacity: 0.9,
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#9DC08B',
    animation: 'pulse 2s infinite',
  },
  headerActions: {
    display: 'flex',
    gap: '0.5rem',
  },
  closeButton: {
    background: 'rgba(255, 255, 255, 0.15)',
    border: 'none',
    color: '#fff',
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '1.2rem',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.3s ease',
  },

  messages: {
    flex: 1,
    overflowY: 'auto',
    padding: '1.25rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    backgroundColor: '#EDF1D6',
  },
  message: {
    display: 'flex',
    gap: '0.6rem',
    animation: 'slideIn 0.3s ease',
  },
  userMessage: {
    justifyContent: 'flex-end',
  },
  botMessage: {
    justifyContent: 'flex-start',
  },
  botAvatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: '#609966',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.2rem',
    flexShrink: 0,
  },
  userAvatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: '#9DC08B',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.2rem',
    flexShrink: 0,
  },
  messageContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.3rem',
    maxWidth: '70%',
  },
  messageBubble: {
    padding: '0.75rem 1rem',
    borderRadius: '16px',
    wordWrap: 'break-word',
  },
  userBubble: {
    backgroundColor: '#609966',
    color: '#fff',
    borderBottomRightRadius: '4px',
  },
  botBubble: {
    backgroundColor: '#fff',
    color: '#23322F',
    borderBottomLeftRadius: '4px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
  },
  errorBubble: {
    backgroundColor: '#ffe6e6',
    color: '#c0392b',
  },
  messageText: {
    fontSize: '0.9rem',
    lineHeight: '1.5',
  },
  time: {
    fontSize: '0.7rem',
    opacity: 0.7,
    paddingLeft: '0.5rem',
  },
  userTime: {
    textAlign: 'right',
    color: '#40513B',
  },
  botTime: {
    textAlign: 'left',
    color: '#609966',
  },

  typingIndicator: {
    display: 'flex',
    gap: '0.4rem',
    padding: '0.75rem 1rem',
    backgroundColor: '#fff',
    borderRadius: '16px',
    borderBottomLeftRadius: '4px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
  },
  typingDot: {
    width: '8px',
    height: '8px',
    backgroundColor: '#609966',
    borderRadius: '50%',
    animation: 'typing 1.4s infinite',
  },

  quickActions: {
    padding: '0.75rem 1.25rem',
    backgroundColor: '#EDF1D6',
    borderTop: '1px solid rgba(96, 153, 102, 0.1)',
  },
  quickActionsLabel: {
    fontSize: '0.8rem',
    color: '#40513B',
    fontWeight: '600',
    margin: '0 0 0.5rem 0',
  },
  quickActionButtons: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '0.5rem',
  },
  quickActionBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    padding: '0.6rem 0.8rem',
    backgroundColor: '#fff',
    border: '1px solid #9DC08B',
    borderRadius: '10px',
    fontSize: '0.8rem',
    fontWeight: '600',
    color: '#40513B',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  quickActionEmoji: {
    fontSize: '1rem',
  },

  form: {
    padding: '1rem 1.25rem',
    backgroundColor: '#fff',
    borderTop: '1px solid #e8eae8',
  },
  inputWrapper: {
    display: 'flex',
    gap: '0.5rem',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    padding: '0.85rem 1rem',
    border: '2px solid #9DC08B',
    borderRadius: '12px',
    fontSize: '0.9rem',
    outline: 'none',
    transition: 'all 0.3s ease',
  },
  sendButton: {
    width: '44px',
    height: '44px',
    border: 'none',
    background: 'linear-gradient(135deg, #609966 0%, #40513B 100%)',
    color: '#fff',
    borderRadius: '12px',
    cursor: 'pointer',
    fontSize: '1.2rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.3s ease',
    flexShrink: 0,
  },
  sendButtonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  sendIcon: {
    display: 'inline-block',
  },
  loadingSpinner: {
    display: 'inline-block',
    animation: 'pulse 1s infinite',
  },
};

const launcherStyles = {
  wrapper: {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '0.75rem',
  },
  tooltip: {
    backgroundColor: '#40513B',
    color: '#fff',
    padding: '0.6rem 1rem',
    borderRadius: '10px',
    fontSize: '0.85rem',
    fontWeight: '600',
    boxShadow: '0 4px 12px rgba(64, 81, 59, 0.3)',
    animation: 'fadeIn 0.3s ease',
    whiteSpace: 'nowrap',
  },
  fab: {
    position: 'relative',
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    border: 'none',
    background: 'linear-gradient(135deg, #609966 0%, #40513B 100%)',
    color: '#fff',
    boxShadow: '0 8px 24px rgba(96, 153, 102, 0.4)',
    cursor: 'pointer',
    fontSize: '1.8rem',
    transition: 'all 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabIcon: {
    display: 'inline-block',
  },
  notificationBadge: {
    position: 'absolute',
    top: '4px',
    right: '4px',
    backgroundColor: '#e74c3c',
    color: '#fff',
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    fontSize: '0.7rem',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px solid #fff',
  },
  openContainer: {
    width: '400px',
    maxWidth: 'calc(100vw - 48px)',
    height: '600px',
    maxHeight: 'calc(100vh - 100px)',
    borderRadius: '16px',
    overflow: 'hidden',
    boxShadow: '0 12px 48px rgba(64, 81, 59, 0.25)',
    animation: 'slideIn 0.3s ease',
  },
};

export default ChatWindow;