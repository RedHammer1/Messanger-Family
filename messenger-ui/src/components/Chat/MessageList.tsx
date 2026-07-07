import { useState, useEffect } from 'react';
import type { Message } from '../../types';
import './MessageList.css';

interface MessageListProps {
    messages: Message[];
    searchQuery?: string;
    searchResults?: Message[];
    currentUserId: number;
}

const MessageList = ({ messages, searchQuery = '', searchResults = [] }: MessageListProps) => {
    const [_, setSelectedMessageId] = useState<string | null>(null);

    
    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    };

    const handleMessageClick = (event: React.MouseEvent, messageId: string) => {
        event.stopPropagation();

        setSelectedMessageId(messageId);
    };

    const highlightText = (text: string, query: string) => {
        if (!query || query.length < 2) return text;
        const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        const parts = text.split(regex);
        return parts.map((part, i) => 
            regex.test(part) ? <mark key={i} className="message-highlight-text">{part}</mark> : part
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
                    
                </div>
            ))}
            
           
        </div>
    );
};

export default MessageList;