import { useState, useEffect, useRef } from 'react';
import './ReactionPicker.css';

interface ReactionPickerProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectReaction: (reaction: string) => void;
    onRemoveReaction: () => void;
    currentReaction?: string;
}

const REACTIONS = [
    '👍', '👎', '❤️', '🔥', '🎉', '😊', '😂', '😢', 
    '😮', '😡', '🥰', '🤔', '🙏', '💯', '⭐', '🍿',
    '🎈', '💔', '👀', '😎', '🤣', '😭', '😍', '🥳'
];

const ReactionPicker = ({ isOpen, onClose, onSelectReaction, onRemoveReaction, currentReaction }: ReactionPickerProps) => {
    const [_, setVisibleRange] = useState({ start: 0, end: 8 });
    const pickerRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setIsVisible(true);
            if (scrollContainerRef.current && currentReaction) {
                const index = REACTIONS.indexOf(currentReaction);
                if (index !== -1) {
                    const scrollLeft = index * 56;
                    scrollContainerRef.current.scrollTo({
                        left: scrollLeft - 112,
                        behavior: 'smooth'
                    });
                }
            }
        } else {
            const timer = setTimeout(() => setIsVisible(false), 200);
            return () => clearTimeout(timer);
        }
    }, [isOpen, currentReaction]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose]);

    const handleScroll = () => {
        if (scrollContainerRef.current) {
            const scrollLeft = scrollContainerRef.current.scrollLeft;
            const startIndex = Math.floor(scrollLeft / 56);
            const endIndex = Math.min(startIndex + 8, REACTIONS.length);
            setVisibleRange({ start: startIndex, end: endIndex });
        }
    };

    const handleSelect = (reaction: string) => {
        if (currentReaction === reaction) {
            onRemoveReaction();
        } else {
            onSelectReaction(reaction);
        }
        onClose();
    };

    if (!isOpen && !isVisible) return null;

    return (
        <div 
            className={`reaction-picker-horizontal ${isOpen ? 'open' : 'closing'}`} 
            ref={pickerRef}
        >
            <div className="reaction-picker-header">
                <span className="reaction-picker-title">Реакции</span>
                {currentReaction && (
                    <button className="remove-reaction-btn" onClick={() => {
                        onRemoveReaction();
                        onClose();
                    }}>
                        Убрать реакцию
                    </button>
                )}
                <button className="close-picker-btn" onClick={onClose}>×</button>
            </div>
            <div 
                className="reaction-picker-scroll-horizontal" 
                ref={scrollContainerRef}
                onScroll={handleScroll}
            >
                <div className="reactions-container">
                    {REACTIONS.map((reaction, _) => (
                        <div
                            key={reaction}
                            className={`reaction-option-horizontal ${currentReaction === reaction ? 'active' : ''}`}
                            onClick={() => handleSelect(reaction)}
                        >
                            <span className="reaction-emoji-horizontal">{reaction}</span>
                        </div>
                    ))}
                </div>
            </div>
            <div className="reaction-picker-footer">
                <div className="scroll-indicator-horizontal">
                    <div className="scroll-dot"></div>
                    <div className="scroll-dot"></div>
                    <div className="scroll-dot"></div>
                </div>
            </div>
        </div>
    );
};

export default ReactionPicker;