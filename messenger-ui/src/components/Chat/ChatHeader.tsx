interface ChatHeaderProps {
    chatName: string;
    status?: string;
    onBack?: () => void;
    isGroup?: boolean;
    onSearch?: () => void;
    onInfo?: () => void;
    showBackButton?: boolean;
}

const ChatHeader = ({ chatName, status, onBack, isGroup, onSearch, onInfo, showBackButton }: ChatHeaderProps) => {
    return (
        <div className="chat-header">
            <div className="chat-header-left">
                {showBackButton && (
                    <button className="back-button-mobile" onClick={onBack}>
                        ←
                    </button>
                )}
                <div className="chat-header-info" onClick={onInfo}>
                    <h2 className="chat-name">
                        {chatName}
                        {isGroup && <span className="group-badge">Группа</span>}
                    </h2>
                    {status && <span className="chat-status">{status}</span>}
                </div>
            </div>
            <div className="chat-header-right">
                {onSearch && (
                    <button className="search-in-chat-btn" onClick={onSearch}>
                        🔍
                    </button>
                )}
            </div>
        </div>
    );
};

export default ChatHeader;