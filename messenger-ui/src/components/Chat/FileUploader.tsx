import { useRef, useState } from 'react';
import './FileUploader.css';

interface FileUploaderProps {
    chatId: number;
    currentUserId: number;
    onFileUploaded: (message: any) => void;
}

const FileUploader = ({ chatId, currentUserId, onFileUploaded }: FileUploaderProps) => {
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 50 * 1024 * 1024) {
            alert('Файл слишком большой. Максимальный размер 50MB');
            return;
        }

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch(`http://localhost:3001/api/upload/${chatId}/upload/${currentUserId}`, {
            method: 'POST',
            body: formData
            });

            if (!response.ok) throw new Error('Ошибка загрузки файла');

            const message = await response.json();
            onFileUploaded({
            ...message,
            id: message.id.toString(),
            senderId: message.senderId,
            senderName: message.senderName,
            chatId: message.chatId,
            timestamp: new Date(message.timestamp),
            createdAt: new Date(message.timestamp),
            files: message.file ? [{
                id: message.file.id,
                file_name: message.file.fileName,
                file_path: message.file.filePath,
                file_size: message.file.fileSize,
                file_type: message.file.fileType,
                mime_type: message.file.mimeType
            }] : [],
            isOwn: true
            });
        } catch (err) {
            console.error('Ошибка загрузки:', err);
            alert('Не удалось загрузить файл');
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
        };

    return (
        <>
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                style={{ display: 'none' }}
                accept="image/*,video/*,application/pdf,application/msword,text/plain"
            />
            <button 
                className="attach-file-btn" 
                onClick={handleFileSelect}
                disabled={uploading}
                title="Прикрепить файл"
            >
                {uploading ? '⏳' : '📎'}
            </button>
        </>
    );
};

export default FileUploader;