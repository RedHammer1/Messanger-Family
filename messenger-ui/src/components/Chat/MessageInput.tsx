import { useState, useRef, useEffect, useCallback } from 'react';
import FileUploader from './FileUploader';

interface MessageInputProps {
    onSendMessage: (text: string) => void;
    onTyping: (isTyping: boolean) => void;
    onFileUploaded?: (message: any) => void;
    chatId?: number;
    currentUserId?: number;
}

const MessageInput = ({ onSendMessage, onTyping, onFileUploaded, chatId, currentUserId }: MessageInputProps) => {
    const [message, setMessage] = useState('');
    const isTypingRef = useRef<boolean>(false);

    const sendTypingStatus = useCallback((isTyping: boolean) => {
        if (isTypingRef.current !== isTyping) {
            isTypingRef.current = isTyping;
            onTyping(isTyping);
        }
    }, [onTyping]);

    const handleSend = () => {
        if (message.trim()) {
            onSendMessage(message);
            setMessage('');
            sendTypingStatus(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        setMessage(newValue);
        const isTyping = newValue.length > 0;
        sendTypingStatus(isTyping);
    };

    useEffect(() => {
        return () => {
            if (isTypingRef.current) {
                onTyping(false);
            }
        };
    }, [onTyping]);

    return (
        <div className="message-input-container">
            <div className="message-input-wrapper">
                {chatId && currentUserId && onFileUploaded && (
                    <FileUploader 
                        chatId={chatId}
                        currentUserId={currentUserId}
                        onFileUploaded={onFileUploaded}
                    />
                )}
                <textarea
                    className="message-input"
                    placeholder="Введите сообщение..."
                    value={message}
                    onChange={handleChange}
                    onKeyPress={handleKeyPress}
                    rows={1}
                />
                <button className="send-button" onClick={handleSend}>
                    Отправить
                </button>
            </div>
        </div>
    );
};

export default MessageInput;