import { useState, useEffect } from 'react';
import type { User } from '../../types';
import './Modal.css';

interface CreateGroupModalProps {
    currentUserId: number;
    onClose: () => void;
    onGroupCreated: (chatId: number) => void;
}

const CreateGroupModal = ({ currentUserId, onClose, onGroupCreated }: CreateGroupModalProps) => {
    const [groupName, setGroupName] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<User[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);

    const searchUsers = async (query: string) => {
        if (query.length < 2) {
            setSearchResults([]);
            return;
        }
        try {
            const response = await fetch(`http://localhost:3001/api/users/search?q=${encodeURIComponent(query)}`, {
                headers: { 'X-User-Id': currentUserId.toString() }
            });
            const data = await response.json();
            const filtered = data.filter((u: User) => u.id !== currentUserId && !selectedUsers.some(su => su.id === u.id));
            setSearchResults(filtered);
        } catch (err) {
            console.error('Ошибка поиска:', err);
        }
    };

    const addUser = (user: User) => {
        setSelectedUsers([...selectedUsers, user]);
        setSearchResults([]);
        setSearchQuery('');
    };

    const removeUser = (userId: number) => {
        setSelectedUsers(selectedUsers.filter(u => u.id !== userId));
    };

    const createGroup = async () => {
        if (!groupName.trim()) {
            alert('Введите название группы');
            return;
        }
        
        setLoading(true);
        try {
            const response = await fetch('http://localhost:3001/api/chats/group', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: groupName,
                    createdBy: currentUserId,
                    participants: selectedUsers.map(u => u.id)
                })
            });
            const chat = await response.json();
            onGroupCreated(chat.id);
        } catch (err) {
            console.error('Ошибка создания группы:', err);
            alert('Ошибка создания группы');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery) searchUsers(searchQuery);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Создание группового чата</h2>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>
                <div className="modal-body">
                    <div className="form-group">
                        <label>Название группы *</label>
                        <input
                            type="text"
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                            placeholder="Введите название группы"
                            className="setting-input"
                        />
                    </div>
                    
                    <div className="form-group">
                        <label>Добавить участников (необязательно)</label>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Поиск пользователей по имени или тегу..."
                            className="setting-input"
                        />
                        {searchResults.length > 0 && (
                            <div className="search-results-list">
                                {searchResults.map(user => (
                                    <div key={user.id} className="search-result-item" onClick={() => addUser(user)}>
                                        <div className="result-avatar">{user.name.charAt(0).toUpperCase()}</div>
                                        <div className="result-info">
                                            <div className="result-name">{user.name}</div>
                                            <div className="result-tag">{user.tag}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    
                    {selectedUsers.length > 0 && (
                        <div className="selected-users">
                            <label>Выбранные участники:</label>
                            <div className="selected-users-list">
                                {selectedUsers.map(user => (
                                    <div key={user.id} className="selected-user">
                                        <span>{user.name}</span>
                                        <button onClick={() => removeUser(user.id)}>×</button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    <div className="form-hint">
                        <small>* Группу можно создать без участников. Вы будете единственным участником.</small>
                    </div>
                </div>
                <div className="modal-footer">
                    <button className="cancel-button" onClick={onClose}>Отмена</button>
                    <button className="form-button" onClick={createGroup} disabled={loading}>
                        {loading ? 'Создание...' : 'Создать группу'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreateGroupModal;