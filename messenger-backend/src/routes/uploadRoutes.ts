import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../db/index';

const router = Router();

// Настройка хранилища для файлов
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const chatId = req.params.chatId as string;
        const uploadDir = path.join(__dirname, '../../uploads', chatId);
        
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
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
        return cb(null, true);
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
        let text = '';
        
        if (fileType === 'image') {
            text = '📷 Изображение';
        } else if (fileType === 'video') {
            text = '🎥 Видео';
        } else {
            text = `📎 Файл: ${req.file.originalname}`;
        }
        
        const messageResult = await client.query(
            `INSERT INTO messages (chat_id, sender_id, text, has_attachments) 
             VALUES ($1, $2, $3, true) 
             RETURNING *`,
            [chatId, userId, text]
        );
        
        const message = messageResult.rows[0];
        
        // Сохраняем информацию о файле
        const relativePath = `/uploads/${chatId}/${req.file.filename}`;
        
        await client.query(
            `INSERT INTO message_files (message_id, file_name, file_path, file_size, file_type, mime_type) 
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [message.id, req.file.originalname, relativePath, req.file.size, fileType, req.file.mimetype]
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
                id: message.id,
                fileName: req.file.originalname,
                filePath: relativePath,
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

// ============ НОВЫЙ ENDPOINT ДЛЯ СКАЧИВАНИЯ ФАЙЛА ============
router.get('/download/:messageId/:fileId', async (req, res) => {
    const messageId = parseInt(req.params.messageId as string);
    const fileId = parseInt(req.params.fileId as string);
    const userId = req.headers['x-user-id'] ? parseInt(req.headers['x-user-id'] as string) : null;
    
    if (!userId) {
        return res.status(401).json({ error: 'Не авторизован' });
    }
    
    const client = await pool.connect();
    
    try {
        // Получаем информацию о файле
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
        
        // Проверяем, имеет ли пользователь доступ к чату
        const participantCheck = await client.query(
            `SELECT id FROM chat_participants WHERE chat_id = $1 AND user_id = $2`,
            [file.chat_id, userId]
        );
        
        if (participantCheck.rows.length === 0) {
            return res.status(403).json({ error: 'Доступ запрещён' });
        }
        
        // Полный путь к файлу на сервере
        const filePath = path.join(__dirname, '../../', file.file_path);
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'Файл не найден на сервере' });
        }
        
        // Устанавливаем заголовки для скачивания
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.file_name)}"`);
        res.setHeader('Content-Type', file.mime_type);
        res.setHeader('Content-Length', file.file_size);
        
        // Отправляем файл
        res.download(filePath, file.file_name, (err) => {
            if (err) {
                console.error('Ошибка при скачивании файла:', err);
                if (!res.headersSent) {
                    res.status(500).json({ error: 'Ошибка при скачивании файла' });
                }
            }
        });
        
    } catch (err) {
        console.error('Ошибка скачивания файла:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    } finally {
        client.release();
    }
});

// ============ Эндпоинт для получения информации о файле ============
router.get('/info/:messageId/:fileId', async (req, res) => {
    const messageId = parseInt(req.params.messageId as string);
    const fileId = parseInt(req.params.fileId as string);
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
        
        // Проверяем доступ
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
            downloadUrl: `/api/upload/download/${messageId}/${fileId}`
        });
        
    } catch (err) {
        console.error('Ошибка получения информации о файле:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    } finally {
        client.release();
    }
});

// Получение файла для отображения (просмотр, не скачивание)
router.get('/file/:chatId/:filename', async (req, res) => {
    const chatId = req.params.chatId as string;
    const filename = req.params.filename as string;
    const filePath = path.join(__dirname, '../../uploads', chatId, filename);
    
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Файл не найден' });
    }
    
    res.sendFile(filePath);
});

// Получение файлов сообщения
router.get('/message/:messageId/files', async (req, res) => {
    const messageId = parseInt(req.params.messageId as string);
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

// Удаление файла сообщения
router.delete('/:messageId/file/:fileId', async (req, res) => {
    const messageId = parseInt(req.params.messageId as string);
    const fileId = parseInt(req.params.fileId as string);
    const userId = parseInt(req.headers['x-user-id'] as string);
    
    const client = await pool.connect();
    
    try {
        const messageCheck = await client.query(
            `SELECT sender_id, chat_id FROM messages WHERE id = $1`,
            [messageId]
        );
        
        if (messageCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Сообщение не найдено' });
        }
        
        if (messageCheck.rows[0].sender_id !== userId) {
            return res.status(403).json({ error: 'Вы не можете удалить этот файл' });
        }
        
        const fileResult = await client.query(
            `SELECT file_path FROM message_files WHERE id = $1 AND message_id = $2`,
            [fileId, messageId]
        );
        
        if (fileResult.rows.length > 0) {
            const filePath = path.join(__dirname, '../../', fileResult.rows[0].file_path);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }
        
        await client.query(
            `DELETE FROM message_files WHERE id = $1 AND message_id = $2`,
            [fileId, messageId]
        );
        
        res.json({ message: 'Файл удалён' });
        
    } catch (err) {
        console.error('Ошибка удаления файла:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    } finally {
        client.release();
    }
});

export default router;