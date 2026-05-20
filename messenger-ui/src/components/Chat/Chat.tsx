import { useEffect, useState, useCallback } from 'react';
import io, { Socket } from 'socket.io-client';
import ChatHeader from './ChatHeader';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import ChatSearchPanel from './ChatSearchPanel';
import GroupInfoModal from '../Modals/GroupInfoModal';
import type { User, Message, Chat as ChatType } from '../../types';
import './Chat.css';

interface ChatProps {
    currentUser: User;
    chatId: number | null;
    onBack?: () => void;
}

const Chat = ({ currentUser, chatId, onBack }: ChatProps) => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map());
    const [chatInfo, setChatInfo] = useState<ChatType | null>(null);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [showGroupInfo, setShowGroupInfo] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!chatId) return;

        const fetchChatInfo = async () => {
            setLoading(true);
            try {
                const response = await fetch(`http://localhost:3001/api/chats/${currentUser.id}/chat/${chatId}`);
                const data = await response.json();
                setChatInfo(data);
            } catch (err) {
                console.error('Ошибка загрузки чата:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchChatInfo();
    }, [chatId, currentUser.id]);

    useEffect(() => {
        if (!chatId) return;

        const newSocket = io('/');
        setSocket(newSocket);

        newSocket.on('connect', () => {
            console.log('Подключено к серверу');
            setIsConnected(true);
            newSocket.emit('join', {
                userId: currentUser.id.toString(),
                userName: currentUser.name,
                chatId: chatId.toString()
            });
        });

        newSocket.on('chat_history', (history: Message[]) => {
            const formattedHistory = history.map(msg => ({
                ...msg,
                isOwn: msg.senderId === currentUser.id.toString(),
                timestamp: new Date(msg.timestamp)
            }));
            setMessages(formattedHistory);
        });

        newSocket.on('new_message', (message: Message) => {
            const newMessage = {
                ...message,
                isOwn: message.senderId === currentUser.id.toString(),
                timestamp: new Date(message.timestamp)
            };
            setMessages(prev => [...prev, newMessage]);
        });

        newSocket.on('user_typing', (data: { userId: string; userName: string; isTyping: boolean }) => {
            if (data.userId !== currentUser.id.toString()) {
                setTypingUsers(prev => {
                    const newMap = new Map(prev);
                    if (data.isTyping) {
                        newMap.set(data.userId, data.userName);
                    } else {
                        newMap.delete(data.userId);
                    }
                    return newMap;
                });
            }
        });

        return () => {
            newSocket.close();
        };
    }, [currentUser, chatId]);

    const getChatDisplayName = () => {
        if (!chatInfo) return 'Загрузка...';

        if (chatInfo.type === 'group') {
            return chatInfo.name || 'Групповой чат';
        }

        // Личный чат - проверяем наличие participants
        if (!chatInfo.participants || !Array.isArray(chatInfo.participants)) {
            return 'Пользователь';
        }

        const otherParticipant = chatInfo.participants.find(p => p && p.id !== currentUser.id);
        return otherParticipant?.name || 'Пользователь';
    };

    const getChatStatus = () => {
        if (!chatInfo || chatInfo.type === 'group') return null;

        if (!chatInfo.participants || !Array.isArray(chatInfo.participants)) {
            return null;
        }

        const otherParticipant = chatInfo.participants.find(p => p && p.id !== currentUser.id);
        return otherParticipant?.tag || null;
    };

    const scrollToMessage = (messageId: string) => {
        const element = document.getElementById(`message-${messageId}`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            element.classList.add('message-highlight');
            setTimeout(() => {
                element.classList.remove('message-highlight');
            }, 2000);
        }
        setIsSearchOpen(false);
    };

    const sendMessage = useCallback((text: string) => {
        if (socket && chatId && text.trim()) {
            const messageData = {
                text: text.trim(),
                senderId: currentUser.id.toString(),
                senderName: currentUser.name,
                chatId: chatId.toString()
            };
            socket.emit('send_message', messageData);
        }
    }, [socket, currentUser, chatId]);

    const handleTyping = useCallback((isTyping: boolean) => {
        if (socket && chatId) {
            socket.emit('typing', { chatId: chatId.toString(), isTyping });
        }
    }, [socket, chatId]);

    const getTypingText = () => {
        if (typingUsers.size === 0) return null;
        const names = Array.from(typingUsers.values());
        if (names.length === 1) return `${names[0]} печатает...`;
        if (names.length === 2) return `${names[0]} и ${names[1]} печатают...`;
        return `${names.length} человек печатают...`;
    };

    const handleUpdateGroup = () => {
        // Обновляем информацию о чате
        if (chatId) {
            const fetchChatInfo = async () => {
                try {
                    const response = await fetch(`http://localhost:3001/api/chats/${currentUser.id}/chat/${chatId}`);
                    const data = await response.json();
                    setChatInfo(data);
                } catch (err) {
                    console.error('Ошибка обновления чата:', err);
                }
            };
            fetchChatInfo();
        }
    };

    if (!chatId) {
        return (
            <div className="chat-empty">
                <div className="chat-empty-content">
                    <div className="chat-empty-icon">💬</div>
                    <h3>Выберите чат</h3>
                    <p>Выберите чат из списка слева, чтобы начать общение</p>
                </div>
            </div>
        );
    }

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

    return (
        <div className="chat">
            <ChatHeader
                chatName={getChatDisplayName()}
                status={getChatStatus() || (isConnected ? "онлайн" : "офлайн")}
                onBack={onBack}
                isGroup={chatInfo?.type === 'group'}
                onSearch={() => setIsSearchOpen(true)}
                onInfo={() => chatInfo?.type === 'group' && setShowGroupInfo(true)}
                showBackButton={window.innerWidth <= 768 && !!onBack}
            />

            <MessageList
                messages={messages}
                currentUserId={currentUser.id}
                chatId={chatId}      
                socket={socket}     
                onReactionChange={(messageId, reaction) => {
                    console.log(`Message ${messageId} reaction changed to ${reaction}`);
                }}
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
                onFileUploaded={(message) => {
                    setMessages(prev => [...prev, message]);
                }}
                chatId={chatId}
                currentUserId={currentUser.id}
            />

            <ChatSearchPanel
                isOpen={isSearchOpen}
                onClose={() => setIsSearchOpen(false)}
                chatId={chatId}
                currentUserId={currentUser.id}
                onSearchResultClick={scrollToMessage}
            />

            {showGroupInfo && chatInfo && (
                <GroupInfoModal
                    chatId={chatId}
                    currentUserId={currentUser.id}
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