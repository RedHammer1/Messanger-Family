import { useState, useEffect } from 'react';
import Sidebar from '../Sidebar/Sidebar';
import ChatList from '../ChatList/ChatList';
import Chat from '../Chat/Chat';
import ContactsPage from '../../pages/ContactsPage';
import SettingsPage from '../../pages/SettingsPage';
import ProfilePage from '../../pages/ProfilePage';
import LoginPage from '../../pages/LoginPage';
import RegisterPage from '../../pages/RegisterPage';
import CreateGroupModal from '../Modals/CreateGroupModal';
import SearchModal from '../Modals/SearchModal';
import type { User } from '../../types';
import './Layout.css';

const Layout = () => {
    const [activePage, setActivePage] = useState('login');
    const [user, setUser] = useState<User | null>(null);
    const [selectedChatId, setSelectedChatId] = useState<number | null>(null);
    const [showCreateGroup, setShowCreateGroup] = useState(false);
    const [showSearchModal, setShowSearchModal] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isMobileListVisible, setIsMobileListVisible] = useState(true);
    const [previousPage, setPreviousPage] = useState<string | null>(null);

    useEffect(() => {
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
            const parsedUser = JSON.parse(savedUser) as User;
            setUser(parsedUser);
            setActivePage('chats');
        }
    }, []);

    const handleLogin = (loggedUser: User) => {
        setUser(loggedUser);
        localStorage.setItem('user', JSON.stringify(loggedUser));
        setActivePage('chats');
    };

    const handleLogout = () => {
        setUser(null);
        localStorage.removeItem('user');
        setActivePage('login');
        setSelectedChatId(null);
    };

    const handleUserUpdate = (updatedUser: User) => {
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
    };

    const handleSelectChat = (chatId: number) => {
        setSelectedChatId(chatId);
        setActivePage('chats');
        if (window.innerWidth <= 768) {
            setIsMobileListVisible(false);
        }
    };

    const handleBackToList = () => {
        setSelectedChatId(null);
        setIsMobileListVisible(true);
        setActivePage('chats');
    };

    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    const navigateToPage = (page: string) => {
        setPreviousPage(activePage);
        setActivePage(page);
        setIsSidebarOpen(false);
    };

    const goBack = () => {
        if (previousPage && previousPage !== activePage) {
            setActivePage(previousPage);
            setPreviousPage(null);
        } else {
            setActivePage('chats');
        }
    };

    const renderContent = () => {
        if (!user) {
            switch (activePage) {
                case 'login':
                    return <LoginPage onSwitchToRegister={() => setActivePage('register')} onLogin={handleLogin} />;
                case 'register':
                    return <RegisterPage onSwitchToLogin={() => setActivePage('login')} onRegister={handleLogin} />;
                default:
                    return <LoginPage onSwitchToRegister={() => setActivePage('register')} onLogin={handleLogin} />;
            }
        }

        switch (activePage) {
            case 'chats':
                return (
                    <div className="chats-layout">
                        <div className={`chat-list-wrapper ${!isMobileListVisible ? 'hidden' : ''}`}>
                            <ChatList 
                                currentUser={user} 
                                onSelectChat={handleSelectChat}
                                selectedChatId={selectedChatId || undefined}
                                onMenuToggle={toggleSidebar}
                            />
                        </div>
                        <div className={`chat-wrapper ${!selectedChatId ? 'empty' : ''}`}>
                            <Chat 
                                currentUser={user} 
                                chatId={selectedChatId}
                                onBack={handleBackToList}
                            />
                        </div>
                    </div>
                );
            case 'contacts':
                return (
                    <PageWrapper title="Контакты" onBack={goBack}>
                        <ContactsPage currentUserId={user.id} />
                    </PageWrapper>
                );
            case 'profile':
                return (
                    <PageWrapper title="Профиль" onBack={goBack}>
                        <ProfilePage user={user} onUserUpdate={handleUserUpdate} />
                    </PageWrapper>
                );
            case 'settings':
                return (
                    <PageWrapper title="Настройки" onBack={goBack}>
                        <SettingsPage />
                    </PageWrapper>
                );
            default:
                return <div className="page-container">Страница не найдена</div>;
        }
    };

    return (
        <div className="layout">
            <Sidebar
                isAuthenticated={!!user}
                activePage={activePage}
                onNavigate={navigateToPage}
                onLogout={handleLogout}
                onOpenCreateGroup={() => setShowCreateGroup(true)}
                onOpenSearch={() => setShowSearchModal(true)}
                userName={user?.name}
                userTag={user?.tag}
                isOpen={isSidebarOpen}
                onToggle={toggleSidebar}
            />
            
            <main className="main-content">
                {renderContent()}
            </main>
            
            {showCreateGroup && (
                <CreateGroupModal
                    currentUserId={user?.id || 0}
                    onClose={() => setShowCreateGroup(false)}
                    onGroupCreated={(chatId) => {
                        setSelectedChatId(chatId);
                        setShowCreateGroup(false);
                        setActivePage('chats');
                        if (window.innerWidth <= 768) {
                            setIsMobileListVisible(false);
                        }
                    }}
                />
            )}
            
            {showSearchModal && (
                <SearchModal
                    currentUserId={user?.id || 0}
                    onClose={() => setShowSearchModal(false)}
                    onOpenChat={(chatId) => {
                        setSelectedChatId(chatId);
                        setShowSearchModal(false);
                        setActivePage('chats');
                        if (window.innerWidth <= 768) {
                            setIsMobileListVisible(false);
                        }
                    }}
                />
            )}
        </div>
    );
};

// Компонент-обёртка для страниц с кнопкой назад
interface PageWrapperProps {
    title: string;
    children: React.ReactNode;
    onBack: () => void;
}

const PageWrapper = ({ title, children, onBack }: PageWrapperProps) => {
    return (
        <div className="page-wrapper">
            <div className="page-header-with-back">
                <button className="back-button-page" onClick={onBack}>
                    ←
                </button>
                <h1>{title}</h1>
            </div>
            <div className="page-content-wrapper">
                {children}
            </div>
        </div>
    );
};

export default Layout;