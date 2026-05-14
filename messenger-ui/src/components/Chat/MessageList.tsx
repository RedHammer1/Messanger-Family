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
    const [downloadingFiles, setDownloadingFiles] = useState<Set<number>>(new Set());

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

    // Функция для скачивания файла
    const handleDownloadFile = async (messageId: string, fileId: number, fileName: string) => {
        setDownloadingFiles(prev => new Set(prev).add(fileId));
        
        try {
            const response = await fetch(`http://localhost:3001/api/upload/download/${messageId}/${fileId}`, {
                headers: {
                    'X-User-Id': currentUserId.toString()
                }
            });
            
            if (!response.ok) {
                throw new Error('Ошибка скачивания файла');
            }
            
            // Получаем файл как blob
            const blob = await response.blob();
            
            // Создаём ссылку для скачивания
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
        } catch (err) {
            console.error('Ошибка скачивания:', err);
            alert('Не удалось скачать файл');
        } finally {
            setDownloadingFiles(prev => {
                const newSet = new Set(prev);
                newSet.delete(fileId);
                return newSet;
            });
        }
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    };

    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
        
        if (socket) {
            socket.emit('add_reaction', {
                messageId: parseInt(selectedMessageId),
                userId: currentUserId,
                reaction: reaction,
                chatId: chatId
            });
        }
        
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
        
        if (socket) {
            socket.emit('remove_reaction', {
                messageId: parseInt(selectedMessageId),
                userId: currentUserId,
                chatId: chatId
            });
        }
        
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

    // Компонент для отображения вложений
    const MessageAttachments = ({ messageId, files }: { messageId: string; files: any[] }) => {
        const [selectedFile, setSelectedFile] = useState<any>(null);

        if (!files || files.length === 0) return null;

        const getFileIcon = (fileType: string) => {
            switch (fileType) {
                case 'image': return '🖼️';
                case 'video': return '🎥';
                default: return '📎';
            }
        };

        const handleFileClick = (file: any) => {
            if (file.file_type === 'image' || file.file_type === 'video') {
                setSelectedFile(file);
            }
        };

        return (
            <>
                <div className="message-attachments">
                    {files.map((file, idx) => (
                        <div key={idx} className="attachment-wrapper">
                            <div 
                                className={`message-attachment ${file.file_type}-attachment`}
                                onClick={() => handleFileClick(file)}
                            >
                                {file.file_type === 'image' && (
                                    <img 
                                        src={`http://localhost:3001${file.file_path}`} 
                                        alt={file.file_name}
                                        className="attachment-thumb"
                                    />
                                )}
                                {file.file_type === 'video' && (
                                    <div className="video-preview">
                                        <video src={`http://localhost:3001${file.file_path}`} className="video-thumb" />
                                        <span className="video-play-icon">▶️</span>
                                    </div>
                                )}
                                {file.file_type === 'document' && (
                                    <div className="document-preview">
                                        <span className="doc-icon">{getFileIcon(file.file_type)}</span>
                                        <div className="doc-info">
                                            <span className="doc-name">{file.file_name}</span>
                                            <span className="doc-size">{formatFileSize(file.file_size)}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                            {/* Кнопка скачивания */}
                            <button 
                                className="download-file-btn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDownloadFile(messageId, file.id, file.file_name);
                                }}
                                disabled={downloadingFiles.has(file.id)}
                                title="Скачать файл"
                            >
                                {downloadingFiles.has(file.id) ? '⏳' : '💾'}
                            </button>
                        </div>
                    ))}
                </div>
                
                {selectedFile && (
                    <div className="media-modal" onClick={() => setSelectedFile(null)}>
                        <div className="media-modal-content">
                            {selectedFile.file_type === 'image' ? (
                                <img 
                                    src={`http://localhost:3001${selectedFile.file_path}`} 
                                    alt={selectedFile.file_name}
                                    className="media-full"
                                />
                            ) : (
                                <video 
                                    src={`http://localhost:3001${selectedFile.file_path}`} 
                                    controls 
                                    autoPlay
                                    className="media-full"
                                />
                            )}
                            <div className="media-controls">
                                <button 
                                    className="media-download-btn"
                                    onClick={() => handleDownloadFile(messageId, selectedFile.id, selectedFile.file_name)}
                                >
                                    💾 Скачать
                                </button>
                                <button className="media-close" onClick={() => setSelectedFile(null)}>×</button>
                            </div>
                        </div>
                    </div>
                )}
            </>
        );
    };

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
                    {message.files && message.files.length > 0 && (
                        <MessageAttachments messageId={message.id} files={message.files} />
                    )}
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