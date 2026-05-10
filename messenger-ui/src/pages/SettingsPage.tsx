import { useState } from 'react';
import './Pages.css';

const SettingsPage = () => {
  const [theme, setTheme] = useState('light');
  const [language, setLanguage] = useState('ru');
  const [notifications, setNotifications] = useState(true);

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Настройки</h1>
        <p>Управление параметрами приложения</p>
      </div>
      <div className="page-content">
        <div className="settings-section">
          <h2>Внешний вид</h2>
          <div className="setting-item">
            <span className="setting-label">Тема оформления</span>
            <select 
              className="setting-select"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
            >
              <option value="light">Светлая</option>
              <option value="dark">Тёмная</option>
              <option value="system">Системная</option>
            </select>
          </div>
          <div className="setting-item">
            <span className="setting-label">Язык интерфейса</span>
            <select 
              className="setting-select"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              <option value="ru">Русский</option>
              <option value="en">English</option>
            </select>
          </div>
        </div>

        <div className="settings-section">
          <h2>Уведомления</h2>
          <div className="setting-item">
            <span className="setting-label">Push-уведомления</span>
            <button 
              className="theme-button"
              onClick={() => setNotifications(!notifications)}
            >
              {notifications ? 'Включены' : 'Отключены'}
            </button>
          </div>
        </div>

        <div className="settings-section">
          <h2>Приватность</h2>
          <div className="setting-item">
            <span className="setting-label">Последняя активность</span>
            <span className="setting-value">Все пользователи</span>
          </div>
          <div className="setting-item">
            <span className="setting-label">Блокированные пользователи</span>
            <span className="setting-value">Нет</span>
          </div>
        </div>

        <div className="settings-section">
          <h2>О приложении</h2>
          <div className="setting-item">
            <span className="setting-label">Версия</span>
            <span className="setting-value">1.0.0</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;