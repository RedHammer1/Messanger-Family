import { pool } from './index';

export interface Chat {
    id: number;
    name: string | null;
    type: 'private' | 'group';
    created_by: number;
    created_at: Date;
    updated_at: Date;
    deleted_at?: Date;
    deleted_by?: number;
}

export interface ChatParticipant {
    id: number;
    chat_id: number;
    user_id: number;
    role: 'creator' | 'moderator' | 'member';
    joined_at: Date;
}

export interface Message {
    id: number;
    chat_id: number;
    sender_id: number;
    sender_name?: string;
    text: string;
    created_at: Date;
    updated_at: Date;
}

export interface ChatWithDetails extends Chat {
    participants: { id: number; name: string; tag: string; role: string }[];
    last_message?: Message;
    unread_count?: number;
}

// Создание личного чата (между двумя пользователями)
export async function createPrivateChat(userId1: number, userId2: number): Promise<Chat | null> {
    const client = await pool.connect();
    try {
        // Проверяем, существует ли уже личный чат между этими пользователями
        const existing = await client.query(
            `SELECT c.id, c.name, c.type, c.created_by, c.created_at, c.updated_at
             FROM chats c
             JOIN chat_participants cp1 ON c.id = cp1.chat_id
             JOIN chat_participants cp2 ON c.id = cp2.chat_id
             WHERE c.type = 'private' 
               AND cp1.user_id = $1 
               AND cp2.user_id = $2`,
            [userId1, userId2]
        );
        
        if (existing.rows.length > 0) {
            return existing.rows[0];
        }
        
        // Создаём новый личный чат
        const result = await client.query(
            `INSERT INTO chats (type, created_by) VALUES ('private', $1) RETURNING *`,
            [userId1]
        );
        
        const chat = result.rows[0];
        
        // Добавляем участников
        await client.query(
            `INSERT INTO chat_participants (chat_id, user_id) VALUES ($1, $2), ($1, $3)`,
            [chat.id, userId1, userId2]
        );
        
        return chat;
    } finally {
        client.release();
    }
}

// Создание группового чата
export async function createGroupChat(name: string, createdBy: number, participantIds: number[] = []): Promise<Chat | null> {
    const client = await pool.connect();
    try {
        const result = await client.query(
            `INSERT INTO chats (name, type, created_by) VALUES ($1, 'group', $2) RETURNING *`,
            [name, createdBy]
        );
        
        const chat = result.rows[0];
        
        // Добавляем создателя с ролью creator
        await client.query(
            `INSERT INTO chat_participants (chat_id, user_id, role) VALUES ($1, $2, 'creator')`,
            [chat.id, createdBy]
        );
        
        // Добавляем остальных участников с ролью member
        for (const userId of participantIds) {
            if (userId !== createdBy) {
                await client.query(
                    `INSERT INTO chat_participants (chat_id, user_id, role) VALUES ($1, $2, 'member') ON CONFLICT DO NOTHING`,
                    [chat.id, userId]
                );
            }
        }
        
        return chat;
    } finally {
        client.release();
    }
}



// Получение всех чатов пользователя
export async function getUserChats(userId: number): Promise<ChatWithDetails[]> {
    const client = await pool.connect();
    try {
        const result = await client.query(
            `SELECT c.*, 
                    (SELECT json_agg(json_build_object('id', u.id, 'name', u.name, 'tag', u.tag))
                     FROM chat_participants cp
                     JOIN users u ON cp.user_id = u.id
                     WHERE cp.chat_id = c.id) as participants,
                    (SELECT row_to_json(m)
                     FROM messages m
                     WHERE m.chat_id = c.id
                     ORDER BY m.created_at DESC
                     LIMIT 1) as last_message
             FROM chats c
             JOIN chat_participants cp ON c.id = cp.chat_id
             WHERE cp.user_id = $1
             ORDER BY c.updated_at DESC`,
            [userId]
        );
        
        return result.rows.map(row => ({
            ...row,
            participants: row.participants || [],
            last_message: row.last_message
        }));
    } finally {
        client.release();
    }
}

// Получение информации о чате
export async function getChatById(chatId: number, userId?: number): Promise<ChatWithDetails | null> {
    const client = await pool.connect();
    try {
        // Проверяем, не удалён ли чат
        const chatResult = await client.query(
            `SELECT * FROM chats WHERE id = $1 AND deleted_at IS NULL`,
            [chatId]
        );
        
        if (chatResult.rows.length === 0) return null;
        
        const chat = chatResult.rows[0];
        
        // Если передан userId, проверяем, является ли он участником
        if (userId) {
            const participantCheck = await client.query(
                `SELECT id FROM chat_participants WHERE chat_id = $1 AND user_id = $2`,
                [chatId, userId]
            );
            if (participantCheck.rows.length === 0) return null;
        }
        
        // Получаем участников с их ролями
        const participantsResult = await client.query(
            `SELECT u.id, u.name, u.tag, cp.role
             FROM chat_participants cp
             JOIN users u ON cp.user_id = u.id
             WHERE cp.chat_id = $1`,
            [chatId]
        );
        
        return {
            ...chat,
            participants: participantsResult.rows
        };
    } finally {
        client.release();
    }
}


export async function deleteGroupChat(chatId: number, userId: number): Promise<boolean> {
    const client = await pool.connect();
    try {
        // Проверяем, является ли пользователь создателем чата
        const chatResult = await client.query(
            `SELECT created_by FROM chats WHERE id = $1 AND type = 'group' AND deleted_at IS NULL`,
            [chatId]
        );
        
        if (chatResult.rows.length === 0) return false;
        if (chatResult.rows[0].created_by !== userId) return false;
        
        const result = await client.query(
            `UPDATE chats SET deleted_at = CURRENT_TIMESTAMP, deleted_by = $1 WHERE id = $2`,
            [userId, chatId]
        );
        
        return (result.rowCount || 0) > 0;
    } finally {
        client.release();
    }
}

export async function setModerator(chatId: number, targetUserId: number, currentUserId: number): Promise<boolean> {
    const client = await pool.connect();
    try {
        // Проверяем, что текущий пользователь - создатель чата
        const chatResult = await client.query(
            `SELECT created_by FROM chats WHERE id = $1 AND type = 'group' AND deleted_at IS NULL`,
            [chatId]
        );
        
        if (chatResult.rows.length === 0) return false;
        if (chatResult.rows[0].created_by !== currentUserId) return false;
        
        // Проверяем, что целевой пользователь является участником чата
        const participantResult = await client.query(
            `SELECT id FROM chat_participants WHERE chat_id = $1 AND user_id = $2`,
            [chatId, targetUserId]
        );
        
        if (participantResult.rows.length === 0) return false;
        
        // Назначаем модератором
        const result = await client.query(
            `UPDATE chat_participants SET role = 'moderator' WHERE chat_id = $1 AND user_id = $2`,
            [chatId, targetUserId]
        );
        
        return (result.rowCount || 0) > 0;
    } finally {
        client.release();
    }
}

export async function removeModerator(chatId: number, targetUserId: number, currentUserId: number): Promise<boolean> {
    const client = await pool.connect();
    try {
        const chatResult = await client.query(
            `SELECT created_by FROM chats WHERE id = $1 AND type = 'group' AND deleted_at IS NULL`,
            [chatId]
        );
        
        if (chatResult.rows.length === 0) return false;
        if (chatResult.rows[0].created_by !== currentUserId) return false;
        
        const result = await client.query(
            `UPDATE chat_participants SET role = 'member' WHERE chat_id = $1 AND user_id = $2 AND role = 'moderator'`,
            [chatId, targetUserId]
        );
        
        return (result.rowCount || 0) > 0;
    } finally {
        client.release();
    }
}

export async function getUserRoleInChat(chatId: number, userId: number): Promise<string | null> {
    const client = await pool.connect();
    try {
        const result = await client.query(
            `SELECT role FROM chat_participants WHERE chat_id = $1 AND user_id = $2`,
            [chatId, userId]
        );
        
        return result.rows[0]?.role || null;
    } finally {
        client.release();
    }
}

export async function addParticipantToGroup(chatId: number, targetUserId: number, currentUserId: number): Promise<boolean> {
    const client = await pool.connect();
    try {
        // Проверяем права текущего пользователя
        const userRole = await getUserRoleInChat(chatId, currentUserId);
        if (userRole !== 'creator' && userRole !== 'moderator') return false;
        
        // Проверяем, что чат существует и не удалён
        const chatResult = await client.query(
            `SELECT id FROM chats WHERE id = $1 AND type = 'group' AND deleted_at IS NULL`,
            [chatId]
        );
        if (chatResult.rows.length === 0) return false;
        
        await client.query(
            `INSERT INTO chat_participants (chat_id, user_id, role) VALUES ($1, $2, 'member') ON CONFLICT DO NOTHING`,
            [chatId, targetUserId]
        );
        
        return true;
    } finally {
        client.release();
    }
}

export async function removeParticipantFromGroup(chatId: number, targetUserId: number, currentUserId: number): Promise<boolean> {
    const client = await pool.connect();
    try {
        // Нельзя удалить создателя
        const chatResult = await client.query(
            `SELECT created_by FROM chats WHERE id = $1 AND type = 'group' AND deleted_at IS NULL`,
            [chatId]
        );
        if (chatResult.rows.length === 0) return false;
        if (chatResult.rows[0].created_by === targetUserId) return false;
        
        // Проверяем права текущего пользователя
        const userRole = await getUserRoleInChat(chatId, currentUserId);
        if (userRole !== 'creator' && userRole !== 'moderator') return false;
        
        const result = await client.query(
            `DELETE FROM chat_participants WHERE chat_id = $1 AND user_id = $2`,
            [chatId, targetUserId]
        );
        
        return (result.rowCount || 0) > 0;
    } finally {
        client.release();
    }
}

export async function leaveGroup(chatId: number, userId: number): Promise<boolean> {
    const client = await pool.connect();
    try {
        // Нельзя выйти, если ты создатель
        const chatResult = await client.query(
            `SELECT created_by FROM chats WHERE id = $1 AND type = 'group' AND deleted_at IS NULL`,
            [chatId]
        );
        if (chatResult.rows.length === 0) return false;
        if (chatResult.rows[0].created_by === userId) return false;
        
        const result = await client.query(
            `DELETE FROM chat_participants WHERE chat_id = $1 AND user_id = $2`,
            [chatId, userId]
        );
        
        return (result.rowCount || 0) > 0;
    } finally {
        client.release();
    }
}



// Добавление участника в групповой чат
export async function addParticipant(chatId: number, userId: number): Promise<boolean> {
    const client = await pool.connect();
    try {
        await client.query(
            `INSERT INTO chat_participants (chat_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [chatId, userId]
        );
        return true;
    } finally {
        client.release();
    }
}

// Удаление участника из группового чата
export async function removeParticipant(chatId: number, userId: number): Promise<boolean> {
    const client = await pool.connect();
    try {
        const result = await client.query(
            `DELETE FROM chat_participants WHERE chat_id = $1 AND user_id = $2`,
            [chatId, userId]
        );
        return (result.rowCount || 0) > 0;
    } finally {
        client.release();
    }
}

// Получение участников чата
export async function getChatParticipants(chatId: number): Promise<{ id: number; name: string; tag: string }[]> {
    const client = await pool.connect();
    try {
        const result = await client.query(
            `SELECT u.id, u.name, u.tag
             FROM chat_participants cp
             JOIN users u ON cp.user_id = u.id
             WHERE cp.chat_id = $1`,
            [chatId]
        );
        return result.rows;
    } finally {
        client.release();
    }
}

// Сохранение сообщения в БД
export async function saveMessage(chatId: number, senderId: number, text: string): Promise<Message | null> {
    const client = await pool.connect();
    try {
        const result = await client.query(
            `INSERT INTO messages (chat_id, sender_id, text) VALUES ($1, $2, $3) RETURNING *`,
            [chatId, senderId, text]
        );
        
        // Обновляем updated_at чата
        await client.query(
            `UPDATE chats SET updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
            [chatId]
        );
        
        const message = result.rows[0];
        
        // Получаем имя отправителя
        const senderResult = await client.query(
            `SELECT name FROM users WHERE id = $1`,
            [senderId]
        );
        
        return {
            ...message,
            sender_name: senderResult.rows[0]?.name
        };
    } finally {
        client.release();
    }
}


// Получение истории сообщений чата
export async function getChatMessages(chatId: number, limit: number = 50, offset: number = 0, userId?: number): Promise<Message[]> {
    const client = await pool.connect();
    try {
        // Получаем сообщения
        const result = await client.query(
            `SELECT m.*, u.name as sender_name
             FROM messages m
             JOIN users u ON m.sender_id = u.id
             WHERE m.chat_id = $1
             ORDER BY m.created_at ASC
             LIMIT $2 OFFSET $3`,
            [chatId, limit, offset]
        );
        
        const messages = result.rows;
        
        if (messages.length === 0) return [];
        
        // Получаем ID всех сообщений
        const messageIds = messages.map(m => m.id);
        
        // Добавляем реакции к каждому сообщению
        const message = messages.map(msg => ({
            ...msg
        }));
        
        return message;
    } finally {
        client.release();
    }
}


// Поиск чата по имени (для групповых чатов)
export async function searchChats(userId: number, query: string): Promise<ChatWithDetails[]> {
    const client = await pool.connect();
    try {
        const result = await client.query(
            `SELECT c.*, 
                    (SELECT json_agg(json_build_object('id', u.id, 'name', u.name, 'tag', u.tag))
                     FROM chat_participants cp
                     JOIN users u ON cp.user_id = u.id
                     WHERE cp.chat_id = c.id) as participants
             FROM chats c
             JOIN chat_participants cp ON c.id = cp.chat_id
             WHERE cp.user_id = $1 
               AND c.type = 'group'
               AND c.name ILIKE $2
             ORDER BY c.updated_at DESC`,
            [userId, `%${query}%`]
        );
        
        return result.rows.map(row => ({
            ...row,
            participants: row.participants || []
        }));
    } finally {
        client.release();
    }
}

export async function searchChatsByQuery(userId: number, query: string): Promise<ChatWithDetails[]> {
    const client = await pool.connect();
    try {
        const results: ChatWithDetails[] = [];
        
        // 1. Ищем групповые чаты по названию
        const groupChatsResult = await client.query(
            `SELECT c.id, c.name, c.type, c.created_by, c.created_at, c.updated_at
             FROM chats c
             JOIN chat_participants cp ON c.id = cp.chat_id
             WHERE cp.user_id = $1 
               AND c.type = 'group'
               AND c.name ILIKE $2
             ORDER BY c.updated_at DESC`,
            [userId, `%${query}%`]
        );
        
        // Получаем участников для каждого группового чата
        for (const chat of groupChatsResult.rows) {
            const participantsResult = await client.query(
                `SELECT u.id, u.name, u.tag
                 FROM chat_participants cp
                 JOIN users u ON cp.user_id = u.id
                 WHERE cp.chat_id = $1`,
                [chat.id]
            );
            
            results.push({
                ...chat,
                participants: participantsResult.rows
            });
        }
        
        // 2. Ищем личные чаты по имени или тегу другого участника
        const privateChatsResult = await client.query(
            `SELECT DISTINCT c.id, c.name, c.type, c.created_by, c.created_at, c.updated_at
             FROM chats c
             JOIN chat_participants cp1 ON c.id = cp1.chat_id AND cp1.user_id = $1
             JOIN chat_participants cp2 ON c.id = cp2.chat_id AND cp2.user_id != $1
             JOIN users u ON cp2.user_id = u.id
             WHERE c.type = 'private'
               AND (u.name ILIKE $2 OR u.tag ILIKE $2)
             ORDER BY c.updated_at DESC`,
            [userId, `%${query}%`]
        );
        
        // Получаем участников для каждого личного чата
        for (const chat of privateChatsResult.rows) {
            const participantsResult = await client.query(
                `SELECT u.id, u.name, u.tag
                 FROM chat_participants cp
                 JOIN users u ON cp.user_id = u.id
                 WHERE cp.chat_id = $1`,
                [chat.id]
            );
            
            results.push({
                ...chat,
                participants: participantsResult.rows
            });
        }
        
        // Сортируем результаты по дате обновления
        results.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
        
        return results;
    } finally {
        client.release();
    }
}


export async function searchMessagesInChat(chatId: number, query: string, userId: number): Promise<Message[]> {
    const client = await pool.connect();
    try {
        // Проверяем, является ли пользователь участником чата
        const participantCheck = await client.query(
            `SELECT id FROM chat_participants WHERE chat_id = $1 AND user_id = $2`,
            [chatId, userId]
        );
        
        if (participantCheck.rows.length === 0) {
            return [];
        }
        
        const result = await client.query(
            `SELECT m.*, u.name as sender_name
             FROM messages m
             JOIN users u ON m.sender_id = u.id
             WHERE m.chat_id = $1 
               AND m.text ILIKE $2
             ORDER BY m.created_at DESC
             LIMIT 100`,
            [chatId, `%${query}%`]
        );
        
        return result.rows.reverse();
    } finally {
        client.release();
    }
}

// Глобальный поиск по всем чатам пользователя (по сообщениям)
export async function searchMessagesAllChats(userId: number, query: string): Promise<{ chat: ChatWithDetails; messages: Message[] }[]> {
    const client = await pool.connect();
    try {
        // Получаем все чаты пользователя с участниками
        const userChatsResult = await client.query(
            `SELECT c.id, c.name, c.type, c.created_by, c.created_at, c.updated_at
             FROM chats c
             JOIN chat_participants cp ON c.id = cp.chat_id
             WHERE cp.user_id = $1
             ORDER BY c.updated_at DESC`,
            [userId]
        );
        
        const results = [];
        
        for (const chatRow of userChatsResult.rows) {
            // Получаем участников чата
            const participantsResult = await client.query(
                `SELECT u.id, u.name, u.tag
                 FROM chat_participants cp
                 JOIN users u ON cp.user_id = u.id
                 WHERE cp.chat_id = $1`,
                [chatRow.id]
            );
            
            const chat: ChatWithDetails = {
                ...chatRow,
                participants: participantsResult.rows
            };
            
            // Ищем сообщения в этом чате
            const messagesResult = await client.query(
                `SELECT m.*, u.name as sender_name
                 FROM messages m
                 JOIN users u ON m.sender_id = u.id
                 WHERE m.chat_id = $1 
                   AND m.text ILIKE $2
                 ORDER BY m.created_at DESC
                 LIMIT 50`,
                [chatRow.id, `%${query}%`]
            );
            
            if (messagesResult.rows.length > 0) {
                results.push({
                    chat: chat,
                    messages: messagesResult.rows.reverse()
                });
            }
        }
        
        return results;
    } finally {
        client.release();
    }
}