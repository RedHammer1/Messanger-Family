import { useState, useEffect } from 'react';
import type { Contact, User } from '../types';
import './Pages.css';

interface ContactsPageProps {
    currentUserId: number;
    onStartChat?: (userId: number) => void;
}

const ContactsPage = ({ currentUserId, onStartChat }: ContactsPageProps) => {
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<User[]>([]);
    const [searching, setSearching] = useState(false);

    useEffect(() => {
        fetchContacts();
    }, [currentUserId]);

    const fetchContacts = async () => {
        try {
            const response = await fetch(`http://localhost:3001/api/contacts/${currentUserId}`);
            const data = await response.json();
            setContacts(data);
        } catch (err) {
            console.error('Ошибка загрузки контактов:', err);
        } finally {
            setLoading(false);
        }
    };

    const searchUsers = async (query: string) => {
        if (query.length < 2) {
            setSearchResults([]);
            return;
        }
        setSearching(true);
        try {
            const response = await fetch(`http://localhost:3001/api/users/search?q=${encodeURIComponent(query)}`, {
                headers: { 'X-User-Id': currentUserId.toString() }
            });
            const data = await response.json();
            setSearchResults(data);
        } catch (err) {
            console.error('Ошибка поиска:', err);
        } finally {
            setSearching(false);
        }
    };

    const addToContacts = async (contactId: number) => {
        try {
            const response = await fetch(`http://localhost:3001/api/contacts/${currentUserId}/add/${contactId}`, {
                method: 'POST'
            });
            if (response.ok) {
                alert('Пользователь добавлен в контакты');
                fetchContacts();
            } else {
                alert('Ошибка добавления');
            }
        } catch (err) {
            console.error('Ошибка:', err);
        }
    };

    const startPrivateChat = async (userId: number) => {
        if (onStartChat) {
            onStartChat(userId);
        } else {
            try {
                const response = await fetch('http://localhost:3001/api/chats/private', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId1: currentUserId, userId2: userId })
                });
                const chat = await response.json();
                alert(`Чат создан! ID: ${chat.id}`);
            } catch (err) {
                console.error('Ошибка:', err);
            }
        }
    };

    const getInitials = (name: string) => name.charAt(0).toUpperCase();

    const isContact = (userId: number) => contacts.some(c => c.id === userId);

    if (loading) {
        return <div className="search-loading">Загрузка контактов...</div>;
    }

    return (
        <div className="contacts-container">
            <div className="search-section">
                <input
                    type="text"
                    placeholder="Поиск пользователей по имени или тегу..."
                    value={searchQuery}
                    onChange={(e) => {
                        setSearchQuery(e.target.value);
                        searchUsers(e.target.value);
                    }}
                    className="search-input-large"
                />
                {searching && <div className="search-loading-small">Поиск...</div>}
                {searchResults.length > 0 && (
                    <div className="search-results-list">
                        {searchResults.map(user => (
                            <div key={user.id} className="contact-search-item">
                                <div className="contact-avatar-small">
                                    {user.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="contact-info">
                                    <div className="contact-name">{user.name}</div>
                                    <div className="contact-tag">{user.tag}</div>
                                </div>
                                <div className="contact-actions">
                                    {!isContact(user.id) && (
                                        <button 
                                            className="action-btn add-contact"
                                            onClick={() => addToContacts(user.id)}
                                        >
                                            Добавить
                                        </button>
                                    )}
                                    <button 
                                        className="action-btn message-btn"
                                        onClick={() => startPrivateChat(user.id)}
                                    >
                                        💬
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <h3 className="contacts-title">Мои контакты ({contacts.length})</h3>
            
            {contacts.length === 0 ? (
                <div className="search-empty">У вас пока нет контактов</div>
            ) : (
                <div className="contact-list">
                    {contacts.map((contact) => (
                        <div key={contact.id} className="contact-item">
                            <div className="contact-avatar">
                                {getInitials(contact.name)}
                            </div>
                            <div className="contact-info">
                                <div className="contact-name">{contact.name}</div>
                                <div className="contact-tag">{contact.tag}</div>
                                {contact.bio && <div className="contact-bio">{contact.bio}</div>}
                            </div>
                            <div className="contact-actions">
                                <button 
                                    className="action-btn message-btn"
                                    onClick={() => startPrivateChat(contact.id)}
                                >
                                    💬
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ContactsPage;