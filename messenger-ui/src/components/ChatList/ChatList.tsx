import { useState, useEffect } from 'react';
import type { Chat, User } from '../../types';
import './ChatList.css';

interface ChatListProps {
  currentUser: User;
  onSelectChat: (chatId: number) => void;
  selectedChatId?: number;
  onMenuToggle: () => void;
}

const ChatList = ({ currentUser, onSelectChat, selectedChatId, onMenuToggle }: ChatListProps) => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchChats();
  }, [currentUser.id]);

  const fetchChats = async () => {
    try {
      const response = await fetch(`http://localhost:3001/api/chats/${currentUser.id}`);
      const data = await response.json();
      setChats(data);
    } catch (err) {
      console.error('Ошибка загрузки чатов:', err);
    } finally {
      setLoading(false);
    }
  };

  const getChatDisplayName = (chat: Chat) => {
    if (chat.type === 'group') {
      return chat.name || 'Групповой чат';
    }
    const otherParticipant = chat.participants.find(p => p.id !== currentUser.id);
    return otherParticipant?.name || 'Пользователь';
  };

  const getChatAvatar = (chat: Chat) => {
    if (chat.type === 'group') {
      return '👥';
    }
    const otherParticipant = chat.participants.find(p => p.id !== currentUser.id);
    return otherParticipant?.name.charAt(0).toUpperCase() || '?';
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = diff / (1000 * 60 * 60);
    if (hours < 24) {
      return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
    }
  };

  const filteredChats = chats.filter(chat => {
    if (!searchQuery) return true;
    const name = getChatDisplayName(chat).toLowerCase();
    return name.includes(searchQuery.toLowerCase());
  });

  if (loading) {
    return <div className="chat-list-loading">Загрузка чатов...</div>;
  }

  return (
    <div className="chat-list-container">
      <div className="chat-list-header">
        <div className="chat-list-header-top">
          <button className="menu-toggle-btn" onClick={onMenuToggle}>
            ☰
          </button>
          <h2>Чаты</h2>
          <button
            className="mobile-close-btn"
            onClick={() => window.dispatchEvent(new CustomEvent('closeChatList'))}
          >
            ✕
          </button>
        </div>
        <input
          type="text"
          placeholder="Поиск чатов..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="chat-search-input"
        />
      </div>
      <div className="chat-list">
        {filteredChats.length === 0 ? (
          <div className="no-chats">Нет чатов</div>
        ) : (
          filteredChats.map((chat) => (
            <div
              key={chat.id}
              className={`chat-list-item ${selectedChatId === chat.id ? 'active' : ''}`}
              onClick={() => onSelectChat(chat.id)}
            >
              <div className="chat-list-avatar">
                {getChatAvatar(chat)}
              </div>
              <div className="chat-list-info">
                <div className="chat-list-name">{getChatDisplayName(chat)}</div>
                {chat.last_message && (
                  <div className="chat-list-last-message">
                    <span className="last-message-sender">{chat.last_message.sender_name}: </span>
                    {chat.last_message.text.length > 40
                      ? chat.last_message.text.substring(0, 40) + '...'
                      : chat.last_message.text}
                  </div>
                )}
              </div>
              {chat.last_message && (
                <div className="chat-list-time">
                  {formatTime(chat.last_message.created_at)}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ChatList;