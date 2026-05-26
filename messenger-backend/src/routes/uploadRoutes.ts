import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../db/index';

const router = Router();

// Создаем директорию для uploads, если её нет
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Настройка хранилища для файлов
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const chatId = req.params.chatId;
        const chatUploadDir = path.join(uploadsDir, chatId as string);
        
        if (!fs.existsSync(chatUploadDir)) {
            fs.mkdirSync(chatUploadDir, { recursive: true });
        }
        cb(null, chatUploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

// Фильтр файлов
const fileFilter = (req: any, file: any, cb: any) => {
    const allowedTypes = /jpeg|jpg|png|gif|mp4|webm|pdf|doc|docx|txt|zip/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
        cb(null, true);
    } else {
        cb(new Error('Неподдерживаемый тип файла'));
    }
};

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: fileFilter
});

function getFileType(mimeType: string): string {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    return 'document';
}

// Загрузка файла в чат
router.post('/:chatId/upload/:userId', upload.single('file'), async (req, res) => {
    const chatId = parseInt(req.params.chatId as string);
    const userId = parseInt(req.params.userId as string);
    
    if (!req.file) {
        return res.status(400).json({ error: 'Файл не загружен' });
    }
    
    const client = await pool.connect();
    
    try {
        // Проверяем, является ли пользователь участником чата
        const participantCheck = await client.query(
            `SELECT id FROM chat_participants WHERE chat_id = $1 AND user_id = $2`,
            [chatId, userId]
        );
        
        if (participantCheck.rows.length === 0) {
            fs.unlinkSync(req.file.path);
            return res.status(403).json({ error: 'Вы не участник этого чата' });
        }
        
        // Создаём сообщение с файлом
        const fileType = getFileType(req.file.mimetype);
        
        // Определяем текст сообщения в зависимости от типа файла
        let text = '';
        if (fileType === 'image') {
            text = '📷 Изображение';
        } else if (fileType === 'video') {
            text = '🎥 Видео';
        } else {
            text = `📎 Файл: ${req.file.originalname}`;
        }
        
        const messageResult = await client.query(
            `INSERT INTO messages (chat_id, sender_id, text, has_attachments, has_files) 
             VALUES ($1, $2, $3, true, true) 
             RETURNING *`,
            [chatId, userId, text]
        );
        
        const message = messageResult.rows[0];
        
        // Сохраняем информацию о файле с правильным путем
        const relativePath = `/uploads/${chatId}/${req.file.filename}`;
        const fullPath = `/uploads/${chatId}/${req.file.filename}`;
        
        const fileResult = await client.query(
            `INSERT INTO message_files (message_id, file_name, file_path, file_size, file_type, mime_type) 
             VALUES ($1, $2, $3, $4, $5, $6) 
             RETURNING *`,
            [message.id, req.file.originalname, fullPath, req.file.size, fileType, req.file.mimetype]
        );
        
        // Обновляем updated_at чата
        await client.query(
            `UPDATE chats SET updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
            [chatId]
        );
        
        // Получаем информацию об отправителе
        const senderResult = await client.query(
            `SELECT name FROM users WHERE id = $1`,
            [userId]
        );
        
        const messageWithFile = {
            id: message.id.toString(),
            text: message.text,
            senderId: message.sender_id.toString(),
            senderName: senderResult.rows[0]?.name || 'Unknown',
            chatId: message.chat_id.toString(),
            timestamp: message.created_at,
            hasAttachments: true,
            file: {
                id: fileResult.rows[0].id,
                fileName: req.file.originalname,
                filePath: fullPath,
                fileSize: req.file.size,
                fileType: fileType,
                mimeType: req.file.mimetype
            }
        };
        
        res.json(messageWithFile);
        
    } catch (err) {
        console.error('Ошибка загрузки файла:', err);
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ error: 'Ошибка загрузки файла' });
    } finally {
        client.release();
    }
});

// Получение файла для отображения
router.get('/file/:chatId/:filename', async (req, res) => {
    const chatId = req.params.chatId;
    const filename = req.params.filename;
    const filePath = path.join(uploadsDir, chatId, filename);
    
    console.log('Requesting file:', filePath);
    
    if (!fs.existsSync(filePath)) {
        console.error('File not found:', filePath);
        return res.status(404).json({ error: 'Файл не найден' });
    }
    
    res.sendFile(filePath);
});

// Скачивание файла
router.get('/download/:messageId/:fileId', async (req, res) => {
    const messageId = parseInt(req.params.messageId);
    const fileId = parseInt(req.params.fileId);
    const userId = req.headers['x-user-id'] ? parseInt(req.headers['x-user-id'] as string) : null;
    
    if (!userId) {
        return res.status(401).json({ error: 'Не авторизован' });
    }
    
    const client = await pool.connect();
    
    try {
        const fileResult = await client.query(
            `SELECT mf.*, m.chat_id 
             FROM message_files mf
             JOIN messages m ON mf.message_id = m.id
             WHERE mf.id = $1 AND mf.message_id = $2`,
            [fileId, messageId]
        );
        
        if (fileResult.rows.length === 0) {
            return res.status(404).json({ error: 'Файл не найден' });
        }
        
        const file = fileResult.rows[0];
        
        const participantCheck = await client.query(
            `SELECT id FROM chat_participants WHERE chat_id = $1 AND user_id = $2`,
            [file.chat_id, userId]
        );
        
        if (participantCheck.rows.length === 0) {
            return res.status(403).json({ error: 'Доступ запрещён' });
        }
        
        // Извлекаем filename из file_path
        const filename = file.file_path.split('/').pop();
        const filePath = path.join(uploadsDir, file.chat_id.toString(), filename);
        
        if (!fs.existsSync(filePath)) {
            console.error('File not found:', filePath);
            return res.status(404).json({ error: 'Файл не найден на сервере' });
        }
        
        res.download(filePath, file.file_name);
        
    } catch (err) {
        console.error('Ошибка скачивания файла:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    } finally {
        client.release();
    }
});

// Получение информации о файле
router.get('/info/:messageId/:fileId', async (req, res) => {
    const messageId = parseInt(req.params.messageId);
    const fileId = parseInt(req.params.fileId);
    const userId = req.headers['x-user-id'] ? parseInt(req.headers['x-user-id'] as string) : null;
    
    if (!userId) {
        return res.status(401).json({ error: 'Не авторизован' });
    }
    
    const client = await pool.connect();
    
    try {
        const fileResult = await client.query(
            `SELECT mf.*, m.chat_id 
             FROM message_files mf
             JOIN messages m ON mf.message_id = m.id
             WHERE mf.id = $1 AND mf.message_id = $2`,
            [fileId, messageId]
        );
        
        if (fileResult.rows.length === 0) {
            return res.status(404).json({ error: 'Файл не найден' });
        }
        
        const file = fileResult.rows[0];
        
        const participantCheck = await client.query(
            `SELECT id FROM chat_participants WHERE chat_id = $1 AND user_id = $2`,
            [file.chat_id, userId]
        );
        
        if (participantCheck.rows.length === 0) {
            return res.status(403).json({ error: 'Доступ запрещён' });
        }
        
        res.json({
            id: file.id,
            fileName: file.file_name,
            fileSize: file.file_size,
            fileType: file.file_type,
            mimeType: file.mime_type,
            filePath: file.file_path,
            downloadUrl: `/api/upload/download/${messageId}/${fileId}`
        });
        
    } catch (err) {
        console.error('Ошибка получения информации о файле:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    } finally {
        client.release();
    }
});

// Получение файлов сообщения
router.get('/message/:messageId/files', async (req, res) => {
    const messageId = parseInt(req.params.messageId);
    const client = await pool.connect();
    
    try {
        const result = await client.query(
            `SELECT * FROM message_files WHERE message_id = $1`,
            [messageId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Ошибка получения файлов:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    } finally {
        client.release();
    }
});

export default router;