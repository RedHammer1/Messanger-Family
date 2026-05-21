import { useEffect, useState } from 'react';
import { Outlet, useParams, useNavigate } from 'react-router-dom';
import ChatList from '../components/ChatList/ChatList';
import { useAuth } from '../hooks/useAuth';
import { useUi } from '../hooks/useUi';
import './ChatsLayout.css';

const ChatsLayout = () => {
  const { user } = useAuth();
  const { chatId } = useParams<{ chatId: string }>();
  const navigate = useNavigate();
  const { toggleSidebar } = useUi();
  const [isMobileListVisible, setIsMobileListVisible] = useState(!chatId);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setIsMobileListVisible(true);
      } else {
        setIsMobileListVisible(!chatId);
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, [chatId]);

  const handleSelectChat = (id: number) => {
    navigate(`/chats/${id}`);
    if (window.innerWidth <= 768) {
      setIsMobileListVisible(false);
    }
  };

  const handleBackToList = () => {
    navigate('/chats');
    setIsMobileListVisible(true);
  };

  if (!user) return null;

  return (
    <div className="chats-layout">
      <div className={`chat-list-wrapper ${!isMobileListVisible ? 'hidden' : ''}`}>
        <ChatList
          currentUser={user}
          onSelectChat={handleSelectChat}
          selectedChatId={chatId ? parseInt(chatId) : undefined}
          onMenuToggle={toggleSidebar}
        />
      </div>
      <div className={`chat-wrapper ${!chatId ? 'empty' : ''}`}>
        {chatId ? (
          <Outlet context={{ onBack: handleBackToList }} />
        ) : (
          <div className="chat-placeholder">
            <div className="chat-placeholder-content">
              <div className="chat-placeholder-icon">💬</div>
              <h3>Выберите чат</h3>
              <p>Выберите чат из списка слева, чтобы начать общение</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatsLayout;