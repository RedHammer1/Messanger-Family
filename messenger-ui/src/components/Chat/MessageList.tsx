import { useState, useEffect, useRef } from 'react';
import type { Message, MessageFile } from '../../types';
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

const MessageList = ({ messages, searchQuery = '', searchResults = [], currentUserId, chatId, socket, onOpenReactionPicker }: MessageListProps) => {
  const [reactionsMap, setReactionsMap] = useState<ReactionsMap>({});
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [downloadingFiles, setDownloadingFiles] = useState<Set<number>>(new Set());
  const [selectedMedia, setSelectedMedia] = useState<{ file: MessageFile; messageId: string } | null>(null);
  
  // Refs для управления скроллом
  const messageListRef = useRef<HTMLDivElement>(null);
  const prevScrollHeightRef = useRef<number>(0);
  const prevScrollTopRef = useRef<number>(0);
  const shouldPreserveScrollRef = useRef<boolean>(false);

  // Сохраняем позицию скролла перед обновлением
  useEffect(() => {
    const preserveScroll = () => {
      if (messageListRef.current && shouldPreserveScrollRef.current) {
        prevScrollHeightRef.current = messageListRef.current.scrollHeight;
        prevScrollTopRef.current = messageListRef.current.scrollTop;
      }
    };

    // Восстанавливаем позицию скролла после обновления
    const restoreScroll = () => {
      if (messageListRef.current && shouldPreserveScrollRef.current) {
        const newScrollHeight = messageListRef.current.scrollHeight;
        const heightDiff = newScrollHeight - prevScrollHeightRef.current;
        if (heightDiff > 0) {
          messageListRef.current.scrollTop = prevScrollTopRef.current + heightDiff;
        }
        shouldPreserveScrollRef.current = false;
      }
    };

    // Добавляем MutationObserver для отслеживания изменений DOM
    if (messageListRef.current) {
      const observer = new MutationObserver(() => {
        restoreScroll();
      });
      
      observer.observe(messageListRef.current, { childList: true, subtree: true });
      
      return () => observer.disconnect();
    }
  }, []);

  useEffect(() => {
    const newReactionsMap: ReactionsMap = {};
    messages.forEach(msg => {
      if (msg.reactions && msg.reactions.length > 0) {
        newReactionsMap[msg.id] = {
          reactions: msg.reactions,
          userReaction: msg.userReaction
        };
      }
    });
    setReactionsMap(prev => ({ ...prev, ...newReactionsMap }));
  }, [messages]);

  useEffect(() => {
    if (!socket) return;

    const handleReactionAdded = (data: { messageId: string; reactions: any[]; userId: number }) => {
      // Включаем сохранение скролла перед обновлением
      shouldPreserveScrollRef.current = true;
      
      setReactionsMap(prev => {
        const userReaction = data.reactions.find(r => r.user_id === currentUserId)?.reaction;
        return {
          ...prev,
          [data.messageId]: { reactions: data.reactions, userReaction }
        };
      });
    };

    const handleReactionRemoved = (data: { messageId: string; reactions: any[]; userId: number }) => {
      // Включаем сохранение скролла перед обновлением
      shouldPreserveScrollRef.current = true;
      
      setReactionsMap(prev => {
        const userReaction = data.reactions.find(r => r.user_id === currentUserId)?.reaction;
        return {
          ...prev,
          [data.messageId]: { reactions: data.reactions, userReaction }
        };
      });
    };

    socket.on('reaction_added', handleReactionAdded);
    socket.on('reaction_removed', handleReactionRemoved);

    return () => {
      socket.off('reaction_added', handleReactionAdded);
      socket.off('reaction_removed', handleReactionRemoved);
    };
  }, [socket, currentUserId]);

  const handleDownloadFile = async (messageId: string, fileId: number, fileName: string) => {
    setDownloadingFiles(prev => new Set(prev).add(fileId));
    
    try {
      const response = await fetch(`http://localhost:3001/api/upload/download/${messageId}/${fileId}`, {
        headers: { 'X-User-Id': currentUserId.toString() }
      });
      
      if (!response.ok) throw new Error('Ошибка скачивания');
      
      const blob = await response.blob();
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

  const handleMessageClick = (event: React.MouseEvent, messageId: string) => {
    event.stopPropagation();
    setSelectedMessageId(messageId);
    if (onOpenReactionPicker) onOpenReactionPicker(messageId);
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
    
    if (socket && socket.connected) {
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
      if (!grouped[r.reaction]) grouped[r.reaction] = [];
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
  const MessageAttachments = ({ messageId, files }: { messageId: string; files?: MessageFile[] }) => {
    if (!files || files.length === 0) return null;

    const images = files.filter(f => f.file_type === 'image');
    const otherFiles = files.filter(f => f.file_type !== 'image');

    return (
      <div className="message-attachments">
        {images.map((file, idx) => (
          <div key={idx} className="image-attachment-wrapper">
            <div className="message-image-attachment" onClick={() => setSelectedMedia({ file, messageId })}>
              <img 
                src={`http://localhost:3001${file.file_path}`} 
                alt={file.file_name}
                className="attachment-image-preview"
                loading="lazy"
                onError={(e) => {
                  console.error('Image load error:', file.file_path);
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <button 
                className="download-image-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownloadFile(messageId, file.id, file.file_name);
                }}
                title="Скачать"
              >
                💾
              </button>
            </div>
          </div>
        ))}
        
        {otherFiles.map((file, idx) => (
          <div key={idx} className="document-attachment-wrapper">
            <div className="message-document-attachment">
              <span className="doc-icon">📎</span>
              <div className="doc-info">
                <span className="doc-name">{file.file_name}</span>
                <span className="doc-size">{formatFileSize(file.file_size)}</span>
              </div>
            </div>
            <button 
              className="download-doc-btn"
              onClick={() => handleDownloadFile(messageId, file.id, file.file_name)}
              disabled={downloadingFiles.has(file.id)}
            >
              {downloadingFiles.has(file.id) ? '⏳' : '💾'}
            </button>
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
      <div className="message-list" ref={messageListRef}>
        {messages.length === 0 ? (
          <div className="no-messages">
            <p>Нет сообщений. Напишите что-нибудь!</p>
          </div>
        ) : (
          messages.map((message) => (
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
              
              {message.text && message.text !== '📷 Изображение' && (
                <div className="message-text">
                  {highlightText(message.text, searchQuery)}
                </div>
              )}
              
              {message.files && message.files.length > 0 && (
                <MessageAttachments messageId={message.id} files={message.files} />
              )}
              
              {getReactionDisplay(message.id)}
            </div>
          ))
        )}
        
        <ReactionPicker
          isOpen={!!selectedMessageId}
          onClose={handleClosePicker}
          onSelectReaction={handleSelectReaction}
          onRemoveReaction={handleRemoveReaction}
          currentReaction={currentReaction}
        />
      </div>
      
      {selectedMedia && (
        <div className="media-modal" onClick={() => setSelectedMedia(null)}>
          <div className="media-modal-content">
            <img 
              src={`http://localhost:3001${selectedMedia.file.file_path}`} 
              alt={selectedMedia.file.file_name}
              className="media-full"
            />
            <div className="media-controls">
              <button 
                className="media-download-btn"
                onClick={() => handleDownloadFile(selectedMedia.messageId, selectedMedia.file.id, selectedMedia.file.file_name)}
              >
                💾 Скачать
              </button>
              <button className="media-close" onClick={() => setSelectedMedia(null)}>×</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MessageList;