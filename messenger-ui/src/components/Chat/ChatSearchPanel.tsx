import { useState, useEffect } from 'react';
import type { Message } from '../../types';
import './ChatSearchPanel.css';

interface ChatSearchPanelProps {
    isOpen: boolean;
    onClose: () => void;
    chatId: number;
    currentUserId: number;
    onSearchResultClick: (messageId: string) => void;
}

const ChatSearchPanel = ({ isOpen, onClose, chatId, currentUserId, onSearchResultClick }: ChatSearchPanelProps) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Message[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);

    useEffect(() => {
        if (!isOpen) {
            setSearchQuery('');
            setSearchResults([]);
            setSelectedIndex(-1);
        }
    }, [isOpen]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery.length >= 2) {
                performSearch();
            } else {
                setSearchResults([]);
            }
        }, 300);
        
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const performSearch = async () => {
        setLoading(true);
        try {
            const response = await fetch(`http://localhost:3306/api/chats/${currentUserId}/chat/${chatId}/search?q=${encodeURIComponent(searchQuery)}`);
            const data = await response.json();
            setSearchResults(data);
            setSelectedIndex(data.length > 0 ? 0 : -1);
        } catch (err) {
            console.error('Ошибка поиска:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleResultClick = (messageId: string) => {
        onSearchResultClick(messageId);
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
            regex.test(part) ? <mark key={i} className="search-highlight">{part}</mark> : part
        );
    };

    return (
        <>
            <div className={`chat-search-overlay ${isOpen ? 'open' : ''}`} onClick={onClose} />
            <div className={`chat-search-panel ${isOpen ? 'open' : ''}`}>
                <div className="chat-search-panel-header">
                    <h3>Поиск в чате</h3>
                    <button className="close-panel-btn" onClick={onClose}>×</button>
                </div>
                
                <div className="chat-search-panel-input-wrapper">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Введите слово или фразу..."
                        className="chat-search-panel-input"
                        autoFocus
                    />
                    {searchQuery && (
                        <button className="panel-clear-btn" onClick={() => setSearchQuery('')}>
                            ✕
                        </button>
                    )}
                </div>
                
                <div className="chat-search-panel-results">
                    {loading && (
                        <div className="search-panel-loading">Поиск...</div>
                    )}
                    
                    {!loading && searchQuery.length >= 2 && searchResults.length === 0 && (
                        <div className="search-panel-empty">Сообщений не найдено</div>
                    )}
                    
                    {!loading && searchResults.length > 0 && (
                        <>
                            <div className="search-panel-stats">
                                Найдено: {searchResults.length} сообщений
                            </div>
                            <div className="search-results-list">
                                {searchResults.map((message, idx) => (
                                    <div 
                                        key={message.id} 
                                        className={`search-result-item ${idx === selectedIndex ? 'selected' : ''}`}
                                        onClick={() => handleResultClick(message.id)}
                                    >
                                        <div className="result-item-header">
                                            <span className="result-sender">{message.senderName}</span>
                                            <span className="result-time">{formatDate(message.timestamp)}</span>
                                        </div>
                                        <div className="result-text">
                                            {highlightText(message.text, searchQuery)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </>
    );
};

export default ChatSearchPanel;