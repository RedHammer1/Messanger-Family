import { useState, useEffect } from 'react';
import PageHeader from '../components/PageHeader';
import './Pages.css';

const SettingsPage = () => {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [language, setLanguage] = useState(localStorage.getItem('language') || 'ru');
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    localStorage.getItem('notificationsEnabled') !== 'false'
  );
  const [messageSoundEnabled, setMessageSoundEnabled] = useState(
    localStorage.getItem('messageSoundEnabled') !== 'false'
  );

  useEffect(() => {
    document.body.className = theme;
  }, [theme]);

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage);
    localStorage.setItem('language', newLanguage);
  };

  const handleNotificationsChange = (enabled: boolean) => {
    setNotificationsEnabled(enabled);
    localStorage.setItem('notificationsEnabled', enabled.toString());
    if (enabled && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  };

  const handleMessageSoundChange = (enabled: boolean) => {
    setMessageSoundEnabled(enabled);
    localStorage.setItem('messageSoundEnabled', enabled.toString());
  };

  const clearAllData = () => {
    if (confirm('Вы уверены, что хотите очистить все данные приложения? Это не удалит ваши сообщения с сервера.')) {
      localStorage.clear();
      setTheme('light');
      setLanguage('ru');
      setNotificationsEnabled(true);
      setMessageSoundEnabled(true);
      window.location.reload();
    }
  };

  return (
    <div className="page-container">
      <PageHeader title="Настройки" subtitle="Настройте приложение под себя" />
      <div className="page-content">
        <div className="settings-section">
          <h2>Внешний вид</h2>
          <div className="setting-item">
            <span className="setting-label">Тема оформления</span>
            <select
              value={theme}
              onChange={(e) => handleThemeChange(e.target.value)}
              className="setting-select"
            >
              <option value="light">Светлая</option>
              <option value="dark">Тёмная</option>
              <option value="system">Системная</option>
            </select>
          </div>
          <div className="setting-item">
            <span className="setting-label">Язык интерфейса</span>
            <select
              value={language}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="setting-select"
            >
              <option value="ru">Русский</option>
              <option value="en">English</option>
            </select>
          </div>
        </div>

        <div className="settings-section">
          <h2>Уведомления и звуки</h2>
          <div className="setting-item">
            <span className="setting-label">Push-уведомления</span>
            <label className="setting-checkbox">
              <input
                type="checkbox"
                checked={notificationsEnabled}
                onChange={(e) => handleNotificationsChange(e.target.checked)}
              />
              Включить уведомления
            </label>
          </div>
          <div className="setting-item">
            <span className="setting-label">Звук новых сообщений</span>
            <label className="setting-checkbox">
              <input
                type="checkbox"
                checked={messageSoundEnabled}
                onChange={(e) => handleMessageSoundChange(e.target.checked)}
              />
              Включить звук
            </label>
          </div>
        </div>

        <div className="settings-section">
          <h2>Данные</h2>
          <div className="setting-item">
            <span className="setting-label">Очистить локальные данные</span>
            <button className="danger-button-small" onClick={clearAllData}>
              Очистить
            </button>
          </div>
        </div>

        <div className="settings-section">
          <h2>О приложении</h2>
          <div className="setting-item">
            <span className="setting-label">Версия</span>
            <span className="setting-value">1.0.0</span>
          </div>
          <div className="setting-item">
            <span className="setting-label">Лицензия</span>
            <span className="setting-value">MIT License</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;