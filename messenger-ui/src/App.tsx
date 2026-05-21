import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Layout from './components/Layout/Layout';
import ChatsLayout from './pages/ChatsLayout';
import Chat from './components/Chat/Chat';
import ContactsPage from './pages/ContactsPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  const { user, isLoading } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      
      <Route element={<ProtectedRoute isAllowed={!!user} isLoading={isLoading} redirectTo="/login" />}>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/chats" replace />} />
          <Route path="chats" element={<ChatsLayout />}>
            <Route index element={<div className="chat-placeholder">Выберите чат</div>} />
            <Route path=":chatId" element={<Chat />} />
          </Route>
          <Route path="contacts" element={<ContactsPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default App;