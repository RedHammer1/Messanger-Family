import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './SearchModal.css';

interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  chatId: string;
  timestamp: Date;
  created_at: Date;
  updated_at?: Date;
}

interface ChatInfo {
  id: number;
  name: string | null;
  type: 'private' | 'group';
  participants: { id: number; name: string; tag: string }[];
  last_message?: {
    text: string;
    created_at: string;
    sender_name: string;
  };
}

interface SearchModalProps {
  currentUserId: number;
  onClose: () => void;
}

const formatDateTime = (date: Date) => {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return 'неизвестно';
  return d.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const SearchModal = ({ currentUserId, onClose }: SearchModalProps) => {
  const navigate = useNavigate();
  const [searchType, setSearchType] = useState<'messages' | 'chats'>('messages');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [messageResults, setMessageResults] = useState<{ chat: ChatInfo; messages: Message[] }[]>([]);
  const [chatResults, setChatResults] = useState<ChatInfo[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.length >= 2) {
        if (searchType === 'messages') {
          searchMessages();
        } else {
          searchChats();
        }
      } else {
        setMessageResults([]);
        setChatResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, searchType, currentUserId]);

  const searchMessages = async () => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:3001/api/chats/${currentUserId}/search/messages?q=${encodeURIComponent(query)}`);
      const data = await response.json();
      const fixedData = data.map((item: any) => ({
        ...item,
        messages: item.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.created_at),
          id: msg.id.toString(),
          senderId: msg.sender_id.toString(),
        }))
      }));
      setMessageResults(fixedData);
    } catch (err) {
      console.error('Ошибка поиска сообщений:', err);
    } finally {
      setLoading(false);
    }
  };

  const searchChats = async () => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:3001/api/chats/${currentUserId}/search/chats?q=${encodeURIComponent(query)}`);
      const data = await response.json();
      setChatResults(data);
    } catch (err) {
      console.error('Ошибка поиска чатов:', err);
    } finally {
      setLoading(false);
    }
  };

  const getChatDisplayName = (chat: ChatInfo) => {
    if (chat.type === 'group') {
      return chat.name || 'Групповой чат';
    }
    const otherParticipant = chat.participants.find(p => p.id !== currentUserId);
    return otherParticipant?.name || 'Пользователь';
  };

  const getChatSubtitle = (chat: ChatInfo) => {
    if (chat.type === 'group') {
      return `${chat.participants.length} участников`;
    }
    const otherParticipant = chat.participants.find(p => p.id !== currentUserId);
    return otherParticipant?.tag || '';
  };

  const highlightText = (text: string, query: string) => {
    if (!query) return text;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) => 
      regex.test(part) ? <mark key={i} className="highlight">{part}</mark> : part
    );
  };

  const handleOpenChat = (chatId: number) => {
    navigate(`/chats/${chatId}`);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="search-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Поиск</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="search-tabs">
          <button 
            className={`tab-btn ${searchType === 'messages' ? 'active' : ''}`}
            onClick={() => setSearchType('messages')}
          >
            Поиск по сообщениям
          </button>
          <button 
            className={`tab-btn ${searchType === 'chats' ? 'active' : ''}`}
            onClick={() => setSearchType('chats')}
          >
            Поиск по чатам
          </button>
        </div>

        <div className="search-input-wrapper">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              searchType === 'messages' 
                ? 'Поиск по сообщениям...' 
                : 'Поиск чатов (групп - по названию, личных - по имени или тегу)...'
            }
            className="search-input-large"
            autoFocus
          />
        </div>

        <div className="search-results">
          {loading && <div className="search-loading">Поиск...</div>}
          
          {!loading && query.length >= 2 && searchType === 'messages' && messageResults.length === 0 && (
            <div className="search-empty">Сообщений не найдено</div>
          )}
          
          {!loading && query.length >= 2 && searchType === 'chats' && chatResults.length === 0 && (
            <div className="search-empty">Чатов не найдено</div>
          )}
          
          {searchType === 'messages' && messageResults.map((result, idx) => (
            <div key={idx} className="search-chat-group">
              <div className="chat-group-header" onClick={() => handleOpenChat(result.chat.id)}>
                <span className="chat-icon">{result.chat.type === 'group' ? '👥' : '💬'}</span>
                <span className="chat-name">{getChatDisplayName(result.chat)}</span>
                <span className="chat-type">{result.chat.type === 'group' ? 'Группа' : 'Личный чат'}</span>
              </div>
              <div className="messages-list">
                {result.messages.map((message) => (
                  <div 
                    key={message.id} 
                    className="search-message-item"
                    onClick={() => handleOpenChat(result.chat.id)}
                  >
                    <div className="message-header">
                      <span className="message-sender">{message.senderName}</span>
                      <span className="message-time">
                        {formatDateTime(new Date(message.created_at))}
                        {message.updated_at && new Date(message.updated_at).getTime() !== new Date(message.created_at).getTime() &&
                          <span className="edited-indicator"> (ред.)</span>
                        }
                      </span>
                    </div>
                    <div className="message-text-preview">
                      {highlightText(message.text, query)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          
          {searchType === 'chats' && chatResults.map((chat) => (
            <div 
              key={chat.id} 
              className="search-chat-item"
              onClick={() => handleOpenChat(chat.id)}
            >
              <div className="chat-avatar">
                {chat.type === 'group' ? '👥' : '👤'}
              </div>
              <div className="chat-info">
                <div className="chat-name">{getChatDisplayName(chat)}</div>
                <div className="chat-details">
                  {chat.type === 'group' ? (
                    <span className="participants-count">
                      {chat.participants.length} участников
                    </span>
                  ) : (
                    <span className="participant-tag">
                      {getChatSubtitle(chat)}
                    </span>
                  )}
                </div>
                {chat.last_message && (
                  <div className="chat-last-message">
                    <span className="message-sender-preview">{chat.last_message.sender_name}: </span>
                    {chat.last_message.text.length > 60 
                      ? chat.last_message.text.substring(0, 60) + '...' 
                      : chat.last_message.text}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SearchModal;