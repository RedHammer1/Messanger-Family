import { useEffect, useState, useCallback } from 'react';
import { useParams, useOutletContext, useNavigate } from 'react-router-dom';
import io, { Socket } from 'socket.io-client';
import ChatHeader from './ChatHeader';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import ChatSearchPanel from './ChatSearchPanel';
import GroupInfoModal from '../Modals/GroupInfoModal';
import { useAuth } from '../../hooks/useAuth';
import type { Message, Chat as ChatType } from '../../types';
import './Chat.css';

interface ChatContext {
  onBack: () => void;
}

const Chat = () => {
  const { chatId: chatIdParam } = useParams<{ chatId: string }>();
  const chatId = chatIdParam ? parseInt(chatIdParam, 10) : null;
  const { user: currentUser } = useAuth();
  const { onBack } = useOutletContext<ChatContext>();
  const navigate = useNavigate();

  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map());
  const [chatInfo, setChatInfo] = useState<ChatType | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Загрузка информации о чате
  useEffect(() => {
    if (!chatId || !currentUser) {
      if (!chatId) navigate('/chats');
      return;
    }

    const fetchChatInfo = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`http://localhost:3001/api/chats/${currentUser.id}/chat/${chatId}`);
        if (!response.ok) {
          if (response.status === 404) throw new Error('Чат не найден');
          throw new Error('Ошибка загрузки чата');
        }
        const data = await response.json();
        setChatInfo(data);
      } catch (err: any) {
        console.error('Ошибка загрузки чата:', err);
        setError(err.message);
        setTimeout(() => navigate('/chats'), 2000);
      } finally {
        setLoading(false);
      }
    };
    fetchChatInfo();
  }, [chatId, currentUser, navigate]);

  // Подключение к Socket.IO
  useEffect(() => {
    if (!chatId || !currentUser || loading) return;

    const newSocket = io('http://localhost:3001', {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Socket connected');
      setIsConnected(true);
      newSocket.emit('join', {
        userId: currentUser.id.toString(),
        userName: currentUser.name,
        chatId: chatId.toString(),
      });
    });

newSocket.on('chat_history', (history: any[]) => {
  console.log('Received chat_history:', history.length);
  const formatted: Message[] = history.map(msg => ({
    id: msg.id.toString(),
    text: msg.text,
    senderId: msg.senderId || msg.sender_id?.toString(),
    senderName: msg.senderName || msg.sender_name,
    chatId: msg.chatId || msg.chat_id?.toString(),
    timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(msg.created_at),
    createdAt: msg.created_at ? new Date(msg.created_at) : new Date(),
    updatedAt: msg.updated_at ? new Date(msg.updated_at) : undefined,
    isOwn: (msg.senderId || msg.sender_id?.toString()) === currentUser.id.toString(),
    reactions: msg.reactions || [],
    userReaction: msg.userReaction,
    files: msg.files || [], // Убедитесь, что files приходит с сервера
    hasAttachments: msg.hasAttachments || (msg.files && msg.files.length > 0)
  }));
  setMessages(formatted);
});


newSocket.on('new_message', (message: any) => {
  console.log('New message received:', message);
  const newMsg: Message = {
    id: message.id.toString(),
    text: message.text,
    senderId: message.senderId,
    senderName: message.senderName,
    chatId: message.chatId,
    timestamp: new Date(message.timestamp),
    createdAt: new Date(message.timestamp),
    updatedAt: undefined,
    isOwn: message.senderId === currentUser.id.toString(),
    reactions: message.reactions || [],
    files: message.files || [],
  };
  setMessages(prev => [...prev, newMsg]);
});


    newSocket.on('user_typing', (data: { userId: string; userName: string; isTyping: boolean }) => {
      if (data.userId !== currentUser.id.toString()) {
        setTypingUsers(prev => {
          const newMap = new Map(prev);
          if (data.isTyping) newMap.set(data.userId, data.userName);
          else newMap.delete(data.userId);
          return newMap;
        });
      }
    });

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsConnected(false);
    });

    newSocket.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
      setIsConnected(false);
    });

    return () => {
      newSocket.close();
    };
  }, [chatId, currentUser, loading]);

  const getChatDisplayName = () => {
    if (!chatInfo) return 'Загрузка...';
    if (chatInfo.type === 'group') return chatInfo.name || 'Групповой чат';
    const other = chatInfo.participants?.find(p => p.id !== currentUser?.id);
    return other?.name || 'Пользователь';
  };

  const getChatStatus = () => {
    if (!chatInfo || chatInfo.type === 'group') return null;
    const other = chatInfo.participants?.find(p => p.id !== currentUser?.id);
    return other?.tag || null;
  };

  const scrollToMessage = (messageId: string) => {
    const el = document.getElementById(`message-${messageId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('message-highlight');
      setTimeout(() => el.classList.remove('message-highlight'), 2000);
    }
    setIsSearchOpen(false);
  };

  const sendMessage = useCallback((text: string) => {
    if (socket && chatId && text.trim() && isConnected) {
      socket.emit('send_message', {
        text: text.trim(),
        senderId: currentUser!.id.toString(),
        senderName: currentUser!.name,
        chatId: chatId.toString(),
      });
    } else {
      console.warn('Cannot send message: socket not ready');
    }
  }, [socket, chatId, currentUser, isConnected]);

  const handleTyping = useCallback((isTyping: boolean) => {
    if (socket && chatId && isConnected) {
      socket.emit('typing', { chatId: chatId.toString(), isTyping });
    }
  }, [socket, chatId, isConnected]);

  const getTypingText = () => {
    if (typingUsers.size === 0) return null;
    const names = Array.from(typingUsers.values());
    if (names.length === 1) return `${names[0]} печатает...`;
    if (names.length === 2) return `${names[0]} и ${names[1]} печатают...`;
    return `${names.length} человек печатают...`;
  };

  const handleUpdateGroup = () => {
    if (chatId && currentUser) {
      fetch(`http://localhost:3001/api/chats/${currentUser.id}/chat/${chatId}`)
        .then(res => res.json())
        .then(data => setChatInfo(data))
        .catch(console.error);
    }
  };

  if (!chatId) return null;

  if (loading) {
    return (
      <div className="chat-loading">
        <div className="chat-loading-content">
          <div className="loading-spinner"></div>
          <p>Загрузка чата...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="chat-error">
        <div className="chat-error-content">
          <p>Ошибка: {error}</p>
          <button onClick={() => navigate('/chats')} className="form-button">
            Вернуться к чатам
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="chat">
      <ChatHeader
        chatName={getChatDisplayName()}
        status={getChatStatus() || (isConnected ? 'онлайн' : 'офлайн')}
        onBack={onBack}
        isGroup={chatInfo?.type === 'group'}
        onSearch={() => setIsSearchOpen(true)}
        onInfo={() => chatInfo?.type === 'group' && setShowGroupInfo(true)}
        showBackButton={window.innerWidth <= 768}
      />

      <MessageList
        messages={messages}
        currentUserId={currentUser!.id}
        chatId={chatId}
        socket={socket}
        onReactionChange={() => {}}
      />

      {getTypingText() && (
        <div className="typing-indicator">
          <div className="typing-dots">
            <span className="typing-dot"></span>
            <span className="typing-dot"></span>
            <span className="typing-dot"></span>
          </div>
          {getTypingText()}
        </div>
      )}

      <MessageInput
        onSendMessage={sendMessage}
        onTyping={handleTyping}
        onFileUploaded={(msg) => setMessages(prev => [...prev, msg])}
        chatId={chatId}
        currentUserId={currentUser!.id}
      />

      <ChatSearchPanel
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        chatId={chatId}
        currentUserId={currentUser!.id}
        onSearchResultClick={scrollToMessage}
      />

      {showGroupInfo && chatInfo && (
        <GroupInfoModal
          chatId={chatId}
          currentUserId={currentUser!.id}
          chatName={getChatDisplayName()}
          participants={chatInfo.participants || []}
          onClose={() => setShowGroupInfo(false)}
          onUpdate={handleUpdateGroup}
        />
      )}
    </div>
  );
};

export default Chat;