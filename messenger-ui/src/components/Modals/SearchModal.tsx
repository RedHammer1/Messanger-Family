import { useState, useEffect } from 'react';
import './SearchModal.css';

interface Message {
    id: string;
    text: string;
    senderId: string;
    senderName: string;
    chatId: string;
    timestamp: Date;
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
    onOpenChat: (chatId: number) => void;
}

const SearchModal = ({ currentUserId, onClose, onOpenChat }: SearchModalProps) => {
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
            setMessageResults(data);
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

    const formatDate = (date: Date) => {
        const now = new Date();
        const diff = now.getTime() - new Date(date).getTime();
        const hours = diff / (1000 * 60 * 60);
        
        if (hours < 24) {
            return new Date(date).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        } else {
            return new Date(date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
        }
    };

    const highlightText = (text: string, query: string) => {
        if (!query) return text;
        const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        const parts = text.split(regex);
        return parts.map((part, i) => 
            regex.test(part) ? <mark key={i} className="highlight">{part}</mark> : part
        );
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
                    
                    {/* Результаты поиска сообщений */}
                    {searchType === 'messages' && messageResults.map((result, idx) => (
                        <div key={idx} className="search-chat-group">
                            <div className="chat-group-header" onClick={() => onOpenChat(result.chat.id)}>
                                <span className="chat-icon">{result.chat.type === 'group' ? '👥' : '💬'}</span>
                                <span className="chat-name">{getChatDisplayName(result.chat)}</span>
                                <span className="chat-type">{result.chat.type === 'group' ? 'Группа' : 'Личный чат'}</span>
                            </div>
                            <div className="messages-list">
                                {result.messages.map((message) => (
                                    <div 
                                        key={message.id} 
                                        className="search-message-item"
                                        onClick={() => onOpenChat(result.chat.id)}
                                    >
                                        <div className="message-header">
                                            <span className="message-sender">{message.senderName}</span>
                                            <span className="message-time">{formatDate(message.timestamp)}</span>
                                        </div>
                                        <div className="message-text-preview">
                                            {highlightText(message.text, query)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                    
                    {/* Результаты поиска чатов */}
                    {searchType === 'chats' && chatResults.map((chat) => (
                        <div 
                            key={chat.id} 
                            className="search-chat-item"
                            onClick={() => onOpenChat(chat.id)}
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