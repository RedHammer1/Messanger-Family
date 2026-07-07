import { useState, useEffect } from 'react';
import type { User } from '../../types';
import './Modal.css';

interface GroupInfoModalProps {
    chatId: number;
    currentUserId: number;
    chatName: string;
    participants: { id: number; name: string; tag: string; role: string }[];
    onClose: () => void;
    onUpdate: () => void;
}

const GroupInfoModal = ({ chatId, currentUserId, chatName, participants, onClose, onUpdate }: GroupInfoModalProps) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const [userRole, setUserRole] = useState<string>('');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    useEffect(() => {
        fetchUserRole();
    }, []);

    const fetchUserRole = async () => {
        try {
            const response = await fetch(`http://localhost:3306/api/chats/${currentUserId}/chat/${chatId}/role`);
            const data = await response.json();
            setUserRole(data.role);
        } catch (err) {
            console.error('Ошибка получения роли:', err);
        }
    };

    const searchUsers = async (query: string) => {
        if (query.length < 2) {
            setSearchResults([]);
            return;
        }
        try {
            const response = await fetch(`http://localhost:3306/api/users/search?q=${encodeURIComponent(query)}`, {
                headers: { 'X-User-Id': currentUserId.toString() }
            });
            const data = await response.json();
            const existingIds = participants.map(p => p.id);
            const filtered = data.filter((u: User) => !existingIds.includes(u.id));
            setSearchResults(filtered);
        } catch (err) {
            console.error('Ошибка поиска:', err);
        }
    };

    const addParticipant = async (targetUserId: number) => {
        setLoading(true);
        try {
            const response = await fetch(`http://localhost:3306/api/chats/group/${chatId}/add-participant`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetUserId, currentUserId })
            });
            if (response.ok) {
                onUpdate();
                alert('Участник добавлен');
            } else {
                alert('Ошибка добавления');
            }
        } catch (err) {
            console.error('Ошибка:', err);
        } finally {
            setLoading(false);
            setSearchQuery('');
            setSearchResults([]);
        }
    };

    const removeParticipant = async (targetUserId: number) => {
        if (!confirm('Удалить участника из группы?')) return;
        
        setLoading(true);
        try {
            const response = await fetch(`http://localhost:3306/api/chats/group/${chatId}/remove-participant`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetUserId, currentUserId })
            });
            if (response.ok) {
                onUpdate();
                alert('Участник удалён');
            } else {
                alert('Ошибка удаления');
            }
        } catch (err) {
            console.error('Ошибка:', err);
        } finally {
            setLoading(false);
        }
    };

    const setAsModerator = async (targetUserId: number) => {
        setLoading(true);
        try {
            const response = await fetch(`http://localhost:3306/api/chats/group/${chatId}/moderator`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetUserId, currentUserId })
            });
            if (response.ok) {
                onUpdate();
                alert('Модератор назначен');
            } else {
                alert('Ошибка назначения');
            }
        } catch (err) {
            console.error('Ошибка:', err);
        } finally {
            setLoading(false);
        }
    };

    const removeModerator = async (targetUserId: number) => {
        setLoading(true);
        try {
            const response = await fetch(`http://localhost:3306/api/chats/group/${chatId}/moderator`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetUserId, currentUserId })
            });
            if (response.ok) {
                onUpdate();
                alert('Модератор снят');
            } else {
                alert('Ошибка снятия');
            }
        } catch (err) {
            console.error('Ошибка:', err);
        } finally {
            setLoading(false);
        }
    };

    const leaveGroup = async () => {
        if (!confirm('Вы уверены, что хотите выйти из группы?')) return;
        
        setLoading(true);
        try {
            const response = await fetch(`http://localhost:3306/api/chats/group/${chatId}/leave`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: currentUserId })
            });
            if (response.ok) {
                onClose();
                onUpdate();
                alert('Вы вышли из группы');
            } else {
                alert('Ошибка выхода из группы');
            }
        } catch (err) {
            console.error('Ошибка:', err);
        } finally {
            setLoading(false);
        }
    };

    const deleteGroup = async () => {
        if (!confirm('Удалить группу? Это действие необратимо.')) return;
        
        setLoading(true);
        try {
            const response = await fetch(`http://localhost:3306/api/chats/group/${chatId}/${currentUserId}`, {
                method: 'DELETE'
            });
            if (response.ok) {
                onClose();
                onUpdate();
                alert('Группа удалена');
            } else {
                alert('Ошибка удаления группы');
            }
        } catch (err) {
            console.error('Ошибка:', err);
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

    const isCreator = userRole === 'creator';
    const isModerator = userRole === 'moderator';

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{chatName}</h2>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>
                <div className="modal-body">
                    <div className="group-info-section">
                        <h3>Участники ({participants.length})</h3>
                        
                        {(isCreator || isModerator) && (
                            <div className="add-participant-section">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Добавить участника..."
                                    className="setting-input"
                                />
                                {searchResults.length > 0 && (
                                    <div className="search-results-list">
                                        {searchResults.map(user => (
                                            <div key={user.id} className="search-result-item" onClick={() => addParticipant(user.id)}>
                                                <div className="result-avatar">{user.name.charAt(0).toUpperCase()}</div>
                                                <div className="result-info">
                                                    <div className="result-name">{user.name}</div>
                                                    <div className="result-tag">{user.tag}</div>
                                                </div>
                                                <button className="add-btn">+</button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                        
                        <div className="participants-list">
                            {participants.map(participant => (
                                <div key={participant.id} className="participant-item">
                                    <div className="participant-avatar">
                                        {participant.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="participant-info">
                                        <div className="participant-name">{participant.name}</div>
                                        <div className="participant-tag">{participant.tag}</div>
                                        {participant.role === 'creator' && (
                                            <span className="role-badge creator">Создатель</span>
                                        )}
                                        {participant.role === 'moderator' && (
                                            <span className="role-badge moderator">Модератор</span>
                                        )}
                                    </div>
                                    <div className="participant-actions">
                                        {isCreator && participant.id !== currentUserId && participant.role !== 'creator' && (
                                            <>
                                                {participant.role === 'moderator' ? (
                                                    <button 
                                                        className="action-btn remove-moderator"
                                                        onClick={() => removeModerator(participant.id)}
                                                        disabled={loading}
                                                    >
                                                        Снять модератора
                                                    </button>
                                                ) : (
                                                    <button 
                                                        className="action-btn set-moderator"
                                                        onClick={() => setAsModerator(participant.id)}
                                                        disabled={loading}
                                                    >
                                                        Назначить модератором
                                                    </button>
                                                )}
                                                <button 
                                                    className="action-btn remove"
                                                    onClick={() => removeParticipant(participant.id)}
                                                    disabled={loading}
                                                >
                                                    Удалить
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="modal-footer">
                    {!isCreator && (
                        <button className="danger-button" onClick={leaveGroup} disabled={loading}>
                            Выйти из группы
                        </button>
                    )}
                    {isCreator && (
                        <button className="danger-button" onClick={() => setShowDeleteConfirm(true)} disabled={loading}>
                            Удалить группу
                        </button>
                    )}
                    <button className="cancel-button" onClick={onClose}>Закрыть</button>
                </div>
            </div>
            
            {showDeleteConfirm && (
                <div className="confirm-overlay">
                    <div className="confirm-dialog">
                        <h3>Удалить группу?</h3>
                        <p>Это действие нельзя отменить. Все сообщения будут потеряны.</p>
                        <div className="confirm-buttons">
                            <button onClick={() => setShowDeleteConfirm(false)}>Отмена</button>
                            <button className="danger-button" onClick={deleteGroup}>Удалить</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GroupInfoModal;