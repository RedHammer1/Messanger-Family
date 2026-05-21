import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import type { User } from '../types';
import './Pages.css';

const RegisterPage = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [tag, setTag] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password || !confirmPassword || !tag) {
      setError('Пожалуйста, заполните все поля');
      return;
    }
    if (password !== confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }
    if (password.length < 6) {
      setError('Пароль должен содержать не менее 6 символов');
      return;
    }
    const tagRegex = /^@[a-zA-Z0-9_]{3,30}$/;
    if (!tagRegex.test(tag)) {
      setError('Тег должен начинаться с @ и содержать 3-30 символов (буквы, цифры, _)');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const response = await fetch('http://localhost:3001/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, tag })
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Ошибка регистрации');
        return;
      }

      const fullUser: User = {
        id: data.id,
        name: data.name,
        email: data.email,
        tag: data.tag,
        phone: '',
        bio: '',
        is_phone_visible: false,
        is_email_visible: false
      };
      login(fullUser);
      navigate('/chats');
    } catch (err) {
      setError('Ошибка соединения с сервером');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Регистрация</h1>
        <p>Создайте новый аккаунт</p>
      </div>
      <div className="page-content">
        <form onSubmit={handleSubmit}>
          {error && <div className="error-message">{error}</div>}
          <div className="form-group">
            <label>Ваше имя</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Введите ваше имя"
              disabled={loading}
            />
          </div>
          <div className="form-group">
            <label>Тег (уникальный идентификатор)</label>
            <input
              type="text"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              placeholder="@username"
              disabled={loading}
            />
            <small>Пример: @john_doe (только буквы, цифры и _)</small>
          </div>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Введите ваш email"
              disabled={loading}
            />
          </div>
          <div className="form-group">
            <label>Пароль</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Придумайте пароль"
              disabled={loading}
            />
          </div>
          <div className="form-group">
            <label>Подтверждение пароля</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Повторите пароль"
              disabled={loading}
            />
          </div>
          <button type="submit" className="form-button" disabled={loading}>
            {loading ? 'Регистрация...' : 'Зарегистрироваться'}
          </button>
          <div className="form-link">
            Уже есть аккаунт? <span onClick={() => navigate('/login')}>Войти</span>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterPage;