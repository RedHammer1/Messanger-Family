import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from '../Sidebar/Sidebar';
import { useAuth } from '../../hooks/useAuth';
import { useUi } from '../../hooks/useUi';
import { useState } from 'react';
import CreateGroupModal from '../Modals/CreateGroupModal';
import SearchModal from '../Modals/SearchModal';
import './Layout.css';

const Layout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { isSidebarOpen, toggleSidebar, setSidebarOpen } = useUi();
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);

  const activePage = location.pathname.slice(1).split('/')[0] || 'chats';

  const handleNavigate = (page: string) => {
    navigate(`/${page}`);
    setSidebarOpen(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    setSidebarOpen(false);
  };

  return (
    <div className="layout">
      <Sidebar
        isAuthenticated={!!user}
        activePage={activePage}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
        onOpenCreateGroup={() => setShowCreateGroup(true)}
        onOpenSearch={() => setShowSearchModal(true)}
        userName={user?.name}
        userTag={user?.tag}
        isOpen={isSidebarOpen}
        onToggle={toggleSidebar}
      />
      <main className="main-content">
        <Outlet />
      </main>

      {showCreateGroup && user && (
        <CreateGroupModal
          currentUserId={user.id}
          onClose={() => setShowCreateGroup(false)}
          onGroupCreated={(chatId) => {
            setShowCreateGroup(false);
            navigate(`/chats/${chatId}`);
          }}
        />
      )}

      {showSearchModal && user && (
        <SearchModal
          currentUserId={user.id}
          onClose={() => setShowSearchModal(false)}
        />
      )}
    </div>
  );
};

export default Layout;