import './Sidebar.css';

interface SidebarProps {
  isAuthenticated: boolean;
  activePage: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
  onOpenCreateGroup: () => void;
  onOpenSearch: () => void;
  userName?: string;
  userTag?: string;
  isOpen: boolean;
  onToggle: () => void;
}

const Sidebar = ({
  isAuthenticated,
  activePage,
  onNavigate,
  onLogout,
  onOpenCreateGroup,
  onOpenSearch,
  userName,
  userTag,
  isOpen,
  onToggle,
}: SidebarProps) => {
  const handleNavigate = (page: string) => {
    onNavigate(page);
  };

  if (!isAuthenticated) {
    return (
      <>
        <div className={`sidebar-overlay ${isOpen ? 'open' : ''}`} onClick={onToggle} />
        <div className={`sidebar ${isOpen ? 'open' : ''}`}>
          <div className="sidebar-header">
            <h2>Messenger</h2>
            <button className="close-sidebar" onClick={onToggle}>×</button>
          </div>
          <nav className="sidebar-nav">
            <div
              className={`sidebar-item ${activePage === 'login' ? 'active' : ''}`}
              onClick={() => handleNavigate('login')}
            >
              Вход
            </div>
            <div
              className={`sidebar-item ${activePage === 'register' ? 'active' : ''}`}
              onClick={() => handleNavigate('register')}
            >
              Регистрация
            </div>
          </nav>
        </div>
      </>
    );
  }

  return (
    <>
      <div className={`sidebar-overlay ${isOpen ? 'open' : ''}`} onClick={onToggle} />
      <div className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="user-info">
            <div className="user-avatar">{userName?.charAt(0).toUpperCase()}</div>
            <div className="user-details">
              <div className="user-name">{userName}</div>
              <div className="user-tag">{userTag}</div>
            </div>
          </div>
          <button className="close-sidebar" onClick={onToggle}>×</button>
        </div>

        <div className="sidebar-actions">
          <button className="sidebar-action-btn" onClick={() => { onOpenSearch(); onToggle(); }}>
            🔍 Поиск
          </button>
          <button className="sidebar-action-btn" onClick={() => { onOpenCreateGroup(); onToggle(); }}>
            + Создать группу
          </button>
        </div>

        <nav className="sidebar-nav">
          <div
            className={`sidebar-item ${activePage === 'chats' ? 'active' : ''}`}
            onClick={() => handleNavigate('chats')}
          >
            💬 Чаты
          </div>
          <div
            className={`sidebar-item ${activePage === 'contacts' ? 'active' : ''}`}
            onClick={() => handleNavigate('contacts')}
          >
            📞 Контакты
          </div>
          <div
            className={`sidebar-item ${activePage === 'profile' ? 'active' : ''}`}
            onClick={() => handleNavigate('profile')}
          >
            👤 Профиль
          </div>
          <div
            className={`sidebar-item ${activePage === 'settings' ? 'active' : ''}`}
            onClick={() => handleNavigate('settings')}
          >
            ⚙️ Настройки
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-item logout" onClick={onLogout}>
            🚪 Выйти
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;