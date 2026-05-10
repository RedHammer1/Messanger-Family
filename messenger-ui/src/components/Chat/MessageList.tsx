import { useState, useEffect } from 'react';
import type { Message } from '../../types';
import ReactionPicker from './ReactionPicker';
import './MessageList.css';

interface MessageListProps {
    messages: Message[];
    searchQuery?: string;
    searchResults?: Message[];
    currentUserId: number;
    chatId: number;
    socket: any;
    onReactionChange?: (messageId: string, reaction: string | null) => void;
    onOpenReactionPicker?: (messageId: string) => void;
}

interface ReactionsMap {
    [messageId: string]: {
        reactions: { reaction: string; userId: number; userName: string }[];
        userReaction?: string;
    };
}

const MessageList = ({ messages, searchQuery = '', searchResults = [], currentUserId, chatId, socket, onReactionChange, onOpenReactionPicker }: MessageListProps) => {
    const [reactionsMap, setReactionsMap] = useState<ReactionsMap>({});
    const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
    const [loadingReactions, setLoadingReactions] = useState<Set<string>>(new Set());

    // Подписка на WebSocket события реакций
    useEffect(() => {
        if (!socket) return;

        const handleReactionUpdated = (data: { messageId: string; reactions: any[]; userId: number; reaction: string }) => {
            setReactionsMap(prev => {
                const userReaction = data.reactions.find((r: any) => r.user_id === currentUserId)?.reaction;
                return {
                    ...prev,
                    [data.messageId]: {
                        reactions: data.reactions,
                        userReaction
                    }
                };
            });
        };

        const handleReactionRemoved = (data: { messageId: string; reactions: any[]; userId: number }) => {
            setReactionsMap(prev => {
                const userReaction = data.reactions.find((r: any) => r.user_id === currentUserId)?.reaction;
                return {
                    ...prev,
                    [data.messageId]: {
                        reactions: data.reactions,
                        userReaction
                    }
                };
            });
        };

        socket.on('reaction_updated', handleReactionUpdated);
        socket.on('reaction_removed', handleReactionRemoved);

        return () => {
            socket.off('reaction_updated', handleReactionUpdated);
            socket.off('reaction_removed', handleReactionRemoved);
        };
    }, [socket, currentUserId]);

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    };

    const loadReactions = async (messageId: string) => {
        if (reactionsMap[messageId] || loadingReactions.has(messageId)) return;
        
        setLoadingReactions(prev => new Set(prev).add(messageId));
        try {
            const response = await fetch(`http://localhost:3001/api/chats/reaction/${messageId}`);
            const data = await response.json();
            
            const userReaction = data.find((r: any) => r.user_id === currentUserId)?.reaction;
            
            setReactionsMap(prev => ({
                ...prev,
                [messageId]: {
                    reactions: data,
                    userReaction
                }
            }));
        } catch (err) {
            console.error('Ошибка загрузки реакций:', err);
        } finally {
            setLoadingReactions(prev => {
                const newSet = new Set(prev);
                newSet.delete(messageId);
                return newSet;
            });
        }
    };

    const handleMessageClick = (event: React.MouseEvent, messageId: string) => {
        event.stopPropagation();
        
        // Загружаем реакции если ещё не загружены
        if (!reactionsMap[messageId]) {
            loadReactions(messageId);
        }
        
        setSelectedMessageId(messageId);
        if (onOpenReactionPicker) {
            onOpenReactionPicker(messageId);
        }
    };

    const handleSelectReaction = async (reaction: string) => {
        if (!selectedMessageId) return;
        
        // Отправляем через WebSocket для real-time обновления
        if (socket) {
            socket.emit('add_reaction', {
                messageId: parseInt(selectedMessageId),
                userId: currentUserId,
                reaction: reaction,
                chatId: chatId
            });
        }
        
        // Также делаем REST запрос для надёжности
        try {
            await fetch(`http://localhost:3001/api/chats/reaction/${selectedMessageId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: currentUserId, reaction })
            });
        } catch (err) {
            console.error('Ошибка добавления реакции:', err);
        }
    };

    const handleRemoveReaction = async () => {
        if (!selectedMessageId) return;
        
        // Отправляем через WebSocket для real-time обновления
        if (socket) {
            socket.emit('remove_reaction', {
                messageId: parseInt(selectedMessageId),
                userId: currentUserId,
                chatId: chatId
            });
        }
        
        // Также делаем REST запрос для надёжности
        try {
            await fetch(`http://localhost:3001/api/chats/reaction/${selectedMessageId}/${currentUserId}`, {
                method: 'DELETE'
            });
        } catch (err) {
            console.error('Ошибка удаления реакции:', err);
        }
    };

    const handleClosePicker = () => {
        setSelectedMessageId(null);
    };

    const getReactionDisplay = (messageId: string) => {
        const reactions = reactionsMap[messageId]?.reactions || [];
        if (reactions.length === 0) return null;
        
        // Группируем реакции
        const grouped: { [key: string]: string[] } = {};
        reactions.forEach((r: any) => {
            if (!grouped[r.reaction]) {
                grouped[r.reaction] = [];
            }
            grouped[r.reaction].push(r.user_name);
        });
        
        return (
            <div className="message-reactions">
                {Object.entries(grouped).map(([reaction, users]) => (
                    <span key={reaction} className="reaction-badge" title={users.join(', ')}>
                        {reaction} {users.length}
                    </span>
                ))}
            </div>
        );
    };

    const highlightText = (text: string, query: string) => {
        if (!query || query.length < 2) return text;
        const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        const parts = text.split(regex);
        return parts.map((part, i) => 
            regex.test(part) ? <mark key={i} className="message-highlight-text">{part}</mark> : part
        );
    };

    const currentReaction = selectedMessageId ? reactionsMap[selectedMessageId]?.userReaction : undefined;

    return (
        <div className="message-list">
            {messages.map((message) => (
                <div
                    key={message.id}
                    id={`message-${message.id}`}
                    className={`message ${message.isOwn ? "message-own" : "message-other"} ${searchResults.some(r => r.id === message.id) ? "message-search-result" : ""}`}
                    onClick={(e) => handleMessageClick(e, message.id)}
                >
                    <div className="message-header">
                        <span className="message-sender">{message.senderName}</span>
                        <span className="message-time">{formatTime(message.timestamp)}</span>
                    </div>
                    <div className="message-text">
                        {highlightText(message.text, searchQuery)}
                    </div>
                    {getReactionDisplay(message.id)}
                </div>
            ))}
            
            <ReactionPicker
                isOpen={!!selectedMessageId}
                onClose={handleClosePicker}
                onSelectReaction={handleSelectReaction}
                onRemoveReaction={handleRemoveReaction}
                currentReaction={currentReaction}
            />
        </div>
    );
};

export default MessageList;