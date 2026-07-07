import { useState } from 'react';
import './Pages.css';

interface FoundUser {
    id: number;
    name: string;
    tag: string;
    bio?: string;
    email?: string;
    phone?: string;
}

interface SearchPageProps {
    currentUserId: number;
}

const SearchPage = ({ currentUserId }: SearchPageProps) => {
    const [query, setQuery] = useState('');
    const [users, setUsers] = useState<FoundUser[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedUser, setSelectedUser] = useState<FoundUser | null>(null);
    const [searchPerformed, setSearchPerformed] = useState(false);
    const [isContact, setIsContact] = useState<Map<number, boolean>>(new Map());

    const checkIsContact = async (userId: number) => {
        try {
            const response = await fetch(`http://localhost:3306/api/contacts/${currentUserId}/check/${userId}`);
            const data = await response.json();
            setIsContact(prev => new Map(prev).set(userId, data.isContact));
        } catch (err) {
            console.error('Ошибка проверки контакта:', err);
        }
    };

    const handleSearch = async () => {
        if (query.length < 2) return;
        
        setLoading(true);
        setSearchPerformed(true);
        
        try {
            const response = await fetch(`http://localhost:3306/api/users/search?q=${encodeURIComponent(query)}`, {
                headers: {
                    'X-User-Id': currentUserId.toString()
                }
            });
            const data = await response.json();
            setUsers(data);
            // Проверяем статус контакта для каждого пользователя
            for (const user of data) {
                await checkIsContact(user.id);
            }
        } catch (err) {
            console.error('Ошибка поиска:', err);
        } finally {
            setLoading(false);
        }
    };

    const addToContacts = async (contactId: number) => {
        try {
            const response = await fetch(`http://localhost:3306/api/contacts/${currentUserId}/add/${contactId}`, {
                method: 'POST'
            });
            if (response.ok) {
                setIsContact(prev => new Map(prev).set(contactId, true));
                alert('Пользователь добавлен в контакты');
            } else {
                alert('Не удалось добавить в контакты');
            }
        } catch (err) {
            console.error('Ошибка добавления:', err);
            alert('Ошибка при добавлении');
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    const openUserDetails = (user: FoundUser) => {
        setSelectedUser(user);
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <h1>Поиск пользователей</h1>
                <p>Ищите людей по имени или тегу</p>
            </div>
            <div className="page-content">
                <div className="search-container">
                    <div className="search-input-wrapper">
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Введите имя или тег (например, @redrick)"
                            className="search-input-large"
                        />
                        <button onClick={handleSearch} disabled={loading} className="search-button">
                            {loading ? 'Поиск...' : 'Найти'}
                        </button>
                    </div>
                </div>
                
                {searchPerformed && (
                    <div className="search-results">
                        {loading ? (
                            <div className="search-loading">Поиск...</div>
                        ) : users.length === 0 ? (
                            <div className="search-empty">Ничего не найдено</div>
                        ) : (
                            <div className="user-list">
                                {users.map((user) => (
                                    <div key={user.id} className="user-card" onClick={() => openUserDetails(user)}>
                                        <div className="user-avatar">
                                            {user.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="user-info">
                                            <div className="user-name">{user.name}</div>
                                            <div className="user-tag">{user.tag}</div>
                                            {user.bio && <div className="user-bio">{user.bio}</div>}
                                        </div>
                                        {isContact.get(user.id) && (
                                            <div className="contact-badge">✓ В контактах</div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
                
                {/* Модальное окно с деталями пользователя */}
                {selectedUser && (
                    <div className="modal-overlay" onClick={() => setSelectedUser(null)}>
                        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <h2>{selectedUser.name}</h2>
                                <button className="modal-close" onClick={() => setSelectedUser(null)}>×</button>
                            </div>
                            <div className="modal-body">
                                <div className="detail-item">
                                    <span className="detail-label">Тег:</span>
                                    <span className="detail-value">{selectedUser.tag}</span>
                                </div>
                                {selectedUser.bio && (
                                    <div className="detail-item">
                                        <span className="detail-label">О себе:</span>
                                        <span className="detail-value">{selectedUser.bio}</span>
                                    </div>
                                )}
                                {selectedUser.email && (
                                    <div className="detail-item">
                                        <span className="detail-label">Email:</span>
                                        <span className="detail-value">{selectedUser.email}</span>
                                    </div>
                                )}
                                {selectedUser.phone && (
                                    <div className="detail-item">
                                        <span className="detail-label">Телефон:</span>
                                        <span className="detail-value">{selectedUser.phone}</span>
                                    </div>
                                )}
                                <div className="modal-actions">
                                    {!isContact.get(selectedUser.id) ? (
                                        <button 
                                            className="add-button"
                                            onClick={() => addToContacts(selectedUser.id)}
                                        >
                                            Добавить в контакты
                                        </button>
                                    ) : (
                                        <div className="already-contact">✓ Пользователь уже в ваших контактах</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SearchPage;