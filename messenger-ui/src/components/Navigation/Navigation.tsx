import './Navigation.css';

interface NavigationProps {
    activePage: string;
    onNavigate: (page: string) => void;
    isAuthenticated: boolean;
    onLogout: () => void;
}

const Navigation = ({ activePage, onNavigate, isAuthenticated, onLogout }: NavigationProps) => {
    return (
        <nav className="navigation">
            <div className="nav-brand">
                <span>Messenger</span>
            </div>
            <ul className="nav-menu">
                {isAuthenticated ? (
                    <>
                        <li 
                            className={`nav-item ${activePage === 'chats' ? 'nav-item-active' : ''}`}
                            onClick={() => onNavigate('chats')}
                        >
                            <span className="nav-link">Чаты</span>
                        </li>
                        <li 
                            className={`nav-item ${activePage === 'search' ? 'nav-item-active' : ''}`}
                            onClick={() => onNavigate('search')}
                        >
                            <span className="nav-link">Поиск</span>
                        </li>
                        <li 
                            className={`nav-item ${activePage === 'contacts' ? 'nav-item-active' : ''}`}
                            onClick={() => onNavigate('contacts')}
                        >
                            <span className="nav-link">Контакты</span>
                        </li>
        
                        <li 
                            className="nav-item"
                            onClick={onLogout}
                        >
                            <span className="nav-link">Выйти</span>
                        </li>
                    </>
                ) : (
                    <>
                        <li 
                            className={`nav-item ${activePage === 'login' ? 'nav-item-active' : ''}`}
                            onClick={() => onNavigate('login')}
                        >
                            <span className="nav-link">Вход</span>
                        </li>
                        <li 
                            className={`nav-item ${activePage === 'register' ? 'nav-item-active' : ''}`}
                            onClick={() => onNavigate('register')}
                        >
                            <span className="nav-link">Регистрация</span>
                        </li>
                    </>
                )}
            </ul>
        </nav>
    );
};

export default Navigation;