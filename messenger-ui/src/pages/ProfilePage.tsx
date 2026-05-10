import { useState } from 'react';
import './Pages.css';
import type {User} from "../types"

interface ProfilePageProps {
    user: User;
    onUserUpdate: (updatedUser: User) => void;
}

const ProfilePage = ({ user, onUserUpdate }: ProfilePageProps) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editingPassword, setEditingPassword] = useState(false);
    const [editingTag, setEditingTag] = useState(false);
    const [formData, setFormData] = useState({
        name: user.name,
        phone: user.phone || '',
        bio: user.bio || '',
        is_phone_visible: user.is_phone_visible,
        is_email_visible: user.is_email_visible
    });
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [tagData, setTagData] = useState({
        tag: user.tag || ''
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSaveProfile = async () => {
        setError('');
        setSuccess('');
        setLoading(true);
        
        try {
            const response = await fetch(`http://localhost:3001/api/users/profile/${user.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-Id': user.id.toString()
                },
                body: JSON.stringify(formData)
            });
            const data = await response.json();
            if (!response.ok) {
                setError(data.error || 'Ошибка обновления');
                return;
            }
            onUserUpdate(data);
            setSuccess('Профиль успешно обновлён');
            setIsEditing(false);
        } catch (err) {
            setError('Ошибка соединения с сервером');
        } finally {
            setLoading(false);
        }
    };

    const handleChangePassword = async () => {
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setError('Новые пароли не совпадают');
            return;
        }
        if (passwordData.newPassword.length < 6) {
            setError('Пароль должен содержать не менее 6 символов');
            return;
        }
        
        setError('');
        setSuccess('');
        setLoading(true);
        
        try {
            const response = await fetch(`http://localhost:3001/api/users/profile/${user.id}/password`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-Id': user.id.toString()
                },
                body: JSON.stringify({
                    currentPassword: passwordData.currentPassword,
                    newPassword: passwordData.newPassword
                })
            });
            const data = await response.json();
            if (!response.ok) {
                setError(data.error || 'Ошибка смены пароля');
                return;
            }
            setSuccess('Пароль успешно изменён');
            setEditingPassword(false);
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (err) {
            setError('Ошибка соединения с сервером');
        } finally {
            setLoading(false);
        }
    };

    const handleChangeTag = async () => {
        setError('');
        setSuccess('');
        setLoading(true);
        
        try {
            const response = await fetch(`http://localhost:3001/api/users/profile/${user.id}/tag`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-Id': user.id.toString()
                },
                body: JSON.stringify({ tag: tagData.tag })
            });
            const data = await response.json();
            if (!response.ok) {
                setError(data.error || 'Ошибка обновления тега');
                return;
            }
            setSuccess('Тег успешно обновлён');
            setEditingTag(false);
            onUserUpdate({ ...user, tag: tagData.tag });
        } catch (err) {
            setError('Ошибка соединения с сервером');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <h1>Профиль</h1>
                <p>Управление личной информацией</p>
            </div>
            <div className="page-content">
                {error && <div className="error-message">{error}</div>}
                {success && <div className="success-message">{success}</div>}
                
                {/* Основная информация */}
                <div className="settings-section">
                    <h2>Основная информация</h2>
                    
                    <div className="setting-item">
                        <span className="setting-label">Имя</span>
                        {isEditing ? (
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="setting-input"
                            />
                        ) : (
                            <span className="setting-value">{user.name}</span>
                        )}
                    </div>
                    
                    <div className="setting-item">
                        <span className="setting-label">Email</span>
                        <span className="setting-value">{user.email}</span>
                        <label className="setting-checkbox">
                            <input
                                type="checkbox"
                                checked={formData.is_email_visible}
                                onChange={(e) => setFormData({ ...formData, is_email_visible: e.target.checked })}
                                disabled={!isEditing}
                            />
                            Показывать в профиле
                        </label>
                    </div>
                    
                    <div className="setting-item">
                        <span className="setting-label">Телефон</span>
                        {isEditing ? (
                            <input
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                className="setting-input"
                                placeholder="+7 (XXX) XXX-XX-XX"
                            />
                        ) : (
                            <span className="setting-value">{user.phone || 'Не указан'}</span>
                        )}
                        <label className="setting-checkbox">
                            <input
                                type="checkbox"
                                checked={formData.is_phone_visible}
                                onChange={(e) => setFormData({ ...formData, is_phone_visible: e.target.checked })}
                                disabled={!isEditing}
                            />
                            Показывать в профиле
                        </label>
                    </div>
                    
                    <div className="setting-item">
                        <span className="setting-label">О себе</span>
                        {isEditing ? (
                            <textarea
                                value={formData.bio}
                                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                className="setting-textarea"
                                rows={3}
                                placeholder="Расскажите о себе"
                            />
                        ) : (
                            <span className="setting-value">{user.bio || 'Не указано'}</span>
                        )}
                    </div>
                    
                    {isEditing && (
                        <div className="setting-actions">
                            <button onClick={handleSaveProfile} disabled={loading} className="form-button">
                                {loading ? 'Сохранение...' : 'Сохранить'}
                            </button>
                            <button onClick={() => setIsEditing(false)} className="cancel-button">
                                Отмена
                            </button>
                        </div>
                    )}
                    
                    {!isEditing && (
                        <button onClick={() => setIsEditing(true)} className="edit-button">
                            Редактировать профиль
                        </button>
                    )}
                </div>
                
                {/* Тег */}
                <div className="settings-section">
                    <h2>Тег</h2>
                    <div className="setting-item">
                        <span className="setting-label">Ваш тег</span>
                        {editingTag ? (
                            <div className="tag-edit">
                                <input
                                    type="text"
                                    value={tagData.tag}
                                    onChange={(e) => setTagData({ tag: e.target.value })}
                                    className="setting-input"
                                    placeholder="@username"
                                />
                                <small>Тег должен начинаться с @ и содержать 3-30 символов</small>
                            </div>
                        ) : (
                            <span className="setting-value tag-value">{user.tag || 'Не установлен'}</span>
                        )}
                    </div>
                    {editingTag ? (
                        <div className="setting-actions">
                            <button onClick={handleChangeTag} disabled={loading} className="form-button">
                                {loading ? 'Сохранение...' : 'Сохранить тег'}
                            </button>
                            <button onClick={() => setEditingTag(false)} className="cancel-button">
                                Отмена
                            </button>
                        </div>
                    ) : (
                        <button onClick={() => setEditingTag(true)} className="edit-button">
                            Изменить тег
                        </button>
                    )}
                </div>
                
                {/* Смена пароля */}
                <div className="settings-section">
                    <h2>Безопасность</h2>
                    {editingPassword ? (
                        <>
                            <div className="setting-item">
                                <span className="setting-label">Текущий пароль</span>
                                <input
                                    type="password"
                                    value={passwordData.currentPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                                    className="setting-input"
                                />
                            </div>
                            <div className="setting-item">
                                <span className="setting-label">Новый пароль</span>
                                <input
                                    type="password"
                                    value={passwordData.newPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                    className="setting-input"
                                />
                            </div>
                            <div className="setting-item">
                                <span className="setting-label">Подтверждение</span>
                                <input
                                    type="password"
                                    value={passwordData.confirmPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                    className="setting-input"
                                />
                            </div>
                            <div className="setting-actions">
                                <button onClick={handleChangePassword} disabled={loading} className="form-button">
                                    {loading ? 'Смена...' : 'Сменить пароль'}
                                </button>
                                <button onClick={() => setEditingPassword(false)} className="cancel-button">
                                    Отмена
                                </button>
                            </div>
                        </>
                    ) : (
                        <button onClick={() => setEditingPassword(true)} className="edit-button">
                            Сменить пароль
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;