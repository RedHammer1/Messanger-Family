import { useState } from 'react';
import type { User } from '../types';
import './Pages.css';

interface LoginPageProps {
    onSwitchToRegister: () => void;
    onLogin: (user: User) => void;
}

const LoginPage = ({ onSwitchToRegister, onLogin }: LoginPageProps) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) {
            setError('Пожалуйста, заполните все поля');
            return;
        }
        setError('');
        setLoading(true);

        try {
            const response = await fetch('http://localhost:3001/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await response.json();
            if (!response.ok) {
                setError(data.error || 'Ошибка входа');
                return;
            }
            
            // Приводим данные к полному типу User
            const fullUser: User = {
                id: data.id,
                name: data.name,
                email: data.email,
                tag: data.tag || '',
                phone: data.phone || '',
                bio: data.bio || '',
                is_phone_visible: data.is_phone_visible || false,
                is_email_visible: data.is_email_visible || false
            };
            onLogin(fullUser);
        } catch (err) {
            setError('Ошибка соединения с сервером');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <h1>Вход в аккаунт</h1>
                <p>Войдите в свой аккаунт чтобы продолжить</p>
            </div>
            <div className="page-content">
                <form onSubmit={handleSubmit}>
                    {error && <div className="error-message">{error}</div>}
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
                            placeholder="Введите пароль"
                            disabled={loading}
                        />
                    </div>
                    <button type="submit" className="form-button" disabled={loading}>
                        {loading ? 'Вход...' : 'Войти'}
                    </button>
                    <div className="form-link">
                        Нет аккаунта? <span onClick={onSwitchToRegister}>Зарегистрироваться</span>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default LoginPage;