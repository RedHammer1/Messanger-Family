import { useState, useRef, useEffect, useCallback } from 'react';

interface MessageInputProps {
    onSendMessage: (text: string) => void;
    onTyping: (isTyping: boolean) => void;
}

const MessageInput = ({ onSendMessage, onTyping }: MessageInputProps) => {
    const [message, setMessage] = useState('');
    const isTypingRef = useRef<boolean>(false);

    // Отправка статуса печати
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
            // После отправки сообщения - перестаём печатать
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
        
        // Определяем статус печати: true если есть текст, false если пусто
        const isTyping = newValue.length > 0;
        sendTypingStatus(isTyping);
    };

    // При размонтировании компонента сообщаем, что перестали печатать
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