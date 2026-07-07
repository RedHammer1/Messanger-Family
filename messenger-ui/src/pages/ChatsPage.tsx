import { useState, useEffect } from 'react';
import Chat from '../components/Chat/Chat';
import CreateGroupModal from '../components/Modals/CreateGroupModal';
import './Pages.css';
import type {User} from "../types"

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

interface ChatsPageProps {
    user: User;
}

const ChatsPage = ({ user }: ChatsPageProps) => {
    const [chats, setChats] = useState<ChatInfo[]>([]);
    const [filteredChats, setFilteredChats] = useState<ChatInfo[]>([]);
    const [selectedChatId, setSelectedChatId] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [showCreateGroup, setShowCreateGroup] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<User[]>([]);
    const [showSearch, setShowSearch] = useState(false);

    useEffect(() => {
        fetchChats();
    }, [user.id]);

    useEffect(() => {
        // Фильтрация чатов по локальному поиску
        if (searchQuery.length >= 2) {
            const filtered = chats.filter(chat => {
                const chatName = getChatDisplayName(chat).toLowerCase();
                return chatName.includes(searchQuery.toLowerCase());
            });
            setFilteredChats(filtered);
        } else {
            setFilteredChats(chats);
        }
    }, [searchQuery, chats]);

    const fetchChats = async () => {
        try {
            const response = await fetch(`http://localhost:3306/api/chats/${user.id}`);
            const data = await response.json();
            setChats(data);
            setFilteredChats(data);
        } catch (err) {
            console.error('Ошибка загрузки чатов:', err);
        } finally {
            setLoading(false);
        }
    };

    const searchUsers = async (query: string) => {
        if (query.length < 2) {
            setSearchResults([]);
            return;
        }
        try {
            const response = await fetch(`http://localhost:3306/api/users/search?q=${encodeURIComponent(query)}`, {
                headers: { 'X-User-Id': user.id.toString() }
            });
            const data = await response.json();
            setSearchResults(data);
        } catch (err) {
            console.error('Ошибка поиска:', err);
        }
    };

    const startPrivateChat = async (otherUserId: number) => {
        try {
            const response = await fetch('http://localhost:3306/api/chats/private', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId1: user.id, userId2: otherUserId })
            });
            const chat = await response.json();
            setSelectedChatId(chat.id);
            setShowSearch(false);
            setSearchQuery('');
            fetchChats();
        } catch (err) {
            console.error('Ошибка создания чата:', err);
        }
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

    const getChatDisplayName = (chat: ChatInfo) => {
        if (chat.type === 'group') {
            return chat.name || 'Групповой чат';
        }
        const otherParticipant = chat.participants.find(p => p.id !== user.id);
        return otherParticipant?.name || 'Пользователь';
    };

    const getChatAvatar = (chat: ChatInfo) => {
        if (chat.type === 'group') {
            return '👥';
        }
        const otherParticipant = chat.participants.find(p => p.id !== user.id);
        return otherParticipant?.name.charAt(0).toUpperCase() || '?';
    };

    const localSearch = (query: string) => {
    if (!query) {
        setFilteredChats(chats);
        return;
    }
    
    const lowerQuery = query.toLowerCase();
    const filtered = chats.filter(chat => {
        if (chat.type === 'group') {
            // Групповые чаты ищем по названию
            return chat.name?.toLowerCase().includes(lowerQuery) || false;
        } else {
            // Личные чаты ищем по имени или тегу другого участника
            const otherParticipant = chat.participants.find(p => p.id !== user.id);
            if (otherParticipant) {
                return otherParticipant.name.toLowerCase().includes(lowerQuery) ||
                       otherParticipant.tag.toLowerCase().includes(lowerQuery);
            }
            return false;
        }
    });
    setFilteredChats(filtered);
};

    // Обновляем обработчик изменения поиска
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSearchQuery(value);
        localSearch(value);
    };


    if (selectedChatId) {
        return (
            <Chat 
                currentUser={user} 
                chatId={selectedChatId} 
                onBack={() => setSelectedChatId(null)}
            />
        );
    }

    return (
        <div className="page-container">
            <div className="page-header">
                <h1>Чаты</h1>
                <div className="header-actions">

                    <button className="create-group-btn" onClick={() => setShowCreateGroup(true)}>
                        + Создать группу
                    </button>
                    <button className="new-chat-btn" onClick={() => setShowSearch(!showSearch)}>
                        + Новый чат
                    </button>
                </div>
            </div>
            <div className="page-content">
                {/* Локальный поиск по чатам */}
                <div className="local-search">
                    <input
                        type="text"
                        placeholder="Поиск чатов по..."
                        value={searchQuery}
                        onChange={handleSearchChange}
                        className="local-search-input"
                    />
                </div>

                {showSearch && (
                    <div className="search-section">
                        <input
                            type="text"
                            placeholder="Поиск пользователей по имени или тегу..."
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                searchUsers(e.target.value);
                            }}
                            className="search-input"
                        />
                        {searchResults.length > 0 && (
                            <div className="search-results-list">
                                {searchResults.map(userResult => (
                                    <div key={userResult.id} className="search-result-item" onClick={() => startPrivateChat(userResult.id)}>
                                        <div className="result-avatar">{userResult.name.charAt(0).toUpperCase()}</div>
                                        <div className="result-info">
                                            <div className="result-name">{userResult.name}</div>
                                            <div className="result-tag">{userResult.tag}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {loading ? (
                    <div className="search-loading">Загрузка чатов...</div>
                ) : filteredChats.length === 0 ? (
                    <div className="search-empty">Чатов не найдено</div>
                ) : (
                    <div className="chat-list">
                        {filteredChats.map((chat) => (
                            <div key={chat.id} className="chat-item" onClick={() => setSelectedChatId(chat.id)}>
                                <div className="chat-avatar">
                                    {getChatAvatar(chat)}
                                </div>
                                <div className="chat-info">
                                    <div className="chat-name-row">
                                        <span className="chat-name">{getChatDisplayName(chat)}</span>
                                        {chat.last_message && (
                                            <span className="chat-time">{formatTime(chat.last_message.created_at)}</span>
                                        )}
                                    </div>
                                    {chat.last_message && (
                                        <div className="chat-last-message">
                                            <span className="message-sender-preview">{chat.last_message.sender_name}: </span>
                                            {chat.last_message.text.length > 50 
                                                ? chat.last_message.text.substring(0, 50) + '...' 
                                                : chat.last_message.text}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {showCreateGroup && (
                <CreateGroupModal
                    currentUserId={user.id}
                    onClose={() => setShowCreateGroup(false)}
                    onGroupCreated={(chatId) => {
                        setSelectedChatId(chatId);
                        fetchChats();
                    }}
                />
            )}
        </div>
    );
};

export default ChatsPage;