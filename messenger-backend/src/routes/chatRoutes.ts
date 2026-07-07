import { Router } from 'express';
import {
    createPrivateChat,
    createGroupChat,
    getUserChats,
    getChatById,
    getChatMessages,
    searchChats,
    searchMessagesInChat,
    searchMessagesAllChats,
    searchChatsByQuery,
    addParticipantToGroup,
    removeParticipantFromGroup,
    deleteGroupChat,
    setModerator,
    removeModerator,
    getUserRoleInChat,
    leaveGroup
} from '../db/chatQueries';

const router = Router();

// ============ ПОИСК (должен быть ПЕРВЫМ, чтобы не конфликтовать) ============

// Поиск сообщений в конкретном чате
router.get('/:userId/chat/:chatId/search', async (req, res) => {
    const userId = parseInt(req.params.userId);
    const chatId = parseInt(req.params.chatId);
    const query = req.query.q as string || '';

    if (query.length < 2) {
        return res.json([]);
    }

    try {
        const messages = await searchMessagesInChat(chatId, query, userId);
        res.json(messages);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка поиска' });
    }
});

// Глобальный поиск по всем чатам пользователя (по сообщениям)
router.get('/:userId/search/messages', async (req, res) => {
    const userId = parseInt(req.params.userId);
    const query = req.query.q as string || '';

    if (query.length < 2) {
        return res.json([]);
    }

    try {
        const results = await searchMessagesAllChats(userId, query);
        res.json(results);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка поиска' });
    }
});

// Поиск чатов по названию или участнику
router.get('/:userId/search/chats', async (req, res) => {
    const userId = parseInt(req.params.userId);
    const query = req.query.q as string || '';

    if (query.length < 2) {
        return res.json([]);
    }

    try {
        const chats = await searchChatsByQuery(userId, query);
        res.json(chats);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка поиска' });
    }
});

// Поиск групповых чатов
router.get('/search/:userId', async (req, res) => {
    const userId = parseInt(req.params.userId);
    const query = req.query.q as string || '';

    try {
        const chats = await searchChats(userId, query);
        res.json(chats);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка поиска' });
    }
});

// ============ ПОЛУЧЕНИЕ РОЛИ ============
router.get('/:userId/chat/:chatId/role', async (req, res) => {
    const userId = parseInt(req.params.userId);
    const chatId = parseInt(req.params.chatId);
    
    try {
        const role = await getUserRoleInChat(chatId, userId);
        res.json({ role: role || 'none' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка получения роли' });
    }
});

// ============ ЧАТЫ ============

// Получение всех чатов пользователя
router.get('/:userId', async (req, res) => {
    const userId = parseInt(req.params.userId);
    try {
        const chats = await getUserChats(userId);
        res.json(chats);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Получение информации о чате
router.get('/:userId/chat/:chatId', async (req, res) => {
    const userId = parseInt(req.params.userId);
    const chatId = parseInt(req.params.chatId);
    try {
        const chat = await getChatById(chatId, userId);
        if (!chat) {
            return res.status(404).json({ error: 'Чат не найден' });
        }
        res.json(chat);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Получение истории сообщений чата
router.get('/:userId/chat/:chatId/messages', async (req, res) => {
    const userId = parseInt(req.params.userId);
    const chatId = parseInt(req.params.chatId);
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    try {
        const chat = await getChatById(chatId, userId);
        if (!chat) {
            return res.status(403).json({ error: 'Доступ запрещён' });
        }
        const messages = await getChatMessages(chatId, limit, offset, userId);
        res.json(messages);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});


// Создание личного чата
router.post('/private', async (req, res) => {
    const { userId1, userId2 } = req.body;
    try {
        const chat = await createPrivateChat(userId1, userId2);
        res.json(chat);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка создания чата' });
    }
});

// Создание группового чата
router.post('/group', async (req, res) => {
    const { name, createdBy, participants } = req.body;
    
    if (!name || !createdBy) {
        return res.status(400).json({ error: 'Название группы и создатель обязательны' });
    }
    
    try {
        const chat = await createGroupChat(name, createdBy, participants || []);
        res.json(chat);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка создания группы' });
    }
});

// ============ УПРАВЛЕНИЕ ГРУППОЙ (все маршруты начинаются с /group/:chatId/) ============

// Удаление группы (только создатель)
router.delete('/group/:chatId/delete/:userId', async (req, res) => {
    const chatId = parseInt(req.params.chatId);
    const userId = parseInt(req.params.userId);
    
    try {
        const success = await deleteGroupChat(chatId, userId);
        if (!success) {
            return res.status(403).json({ error: 'Удаление группы доступно только создателю' });
        }
        res.json({ message: 'Группа удалена' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка удаления группы' });
    }
});

// Назначение модератора
router.post('/group/:chatId/moderator', async (req, res) => {
    const chatId = parseInt(req.params.chatId);
    const { targetUserId, currentUserId } = req.body;
    
    try {
        const success = await setModerator(chatId, targetUserId, currentUserId);
        if (!success) {
            return res.status(403).json({ error: 'Назначение модератора доступно только создателю' });
        }
        res.json({ message: 'Модератор назначен' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка назначения модератора' });
    }
});

// Снятие модератора
router.delete('/group/:chatId/moderator', async (req, res) => {
    const chatId = parseInt(req.params.chatId);
    const { targetUserId, currentUserId } = req.body;
    
    try {
        const success = await removeModerator(chatId, targetUserId, currentUserId);
        if (!success) {
            return res.status(403).json({ error: 'Снятие модератора доступно только создателю' });
        }
        res.json({ message: 'Модератор снят' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка снятия модератора' });
    }
});

// Добавление участника в группу
router.post('/group/:chatId/add-participant', async (req, res) => {
    const chatId = parseInt(req.params.chatId);
    const { targetUserId, currentUserId } = req.body;
    
    try {
        const success = await addParticipantToGroup(chatId, targetUserId, currentUserId);
        if (!success) {
            return res.status(403).json({ error: 'Недостаточно прав для добавления участника' });
        }
        res.json({ message: 'Участник добавлен' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка добавления участника' });
    }
});

// Удаление участника из группы
router.delete('/group/:chatId/remove-participant', async (req, res) => {
    const chatId = parseInt(req.params.chatId);
    const { targetUserId, currentUserId } = req.body;
    
    try {
        const success = await removeParticipantFromGroup(chatId, targetUserId, currentUserId);
        if (!success) {
            return res.status(403).json({ error: 'Недостаточно прав для удаления участника' });
        }
        res.json({ message: 'Участник удалён' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка удаления участника' });
    }
});

// Выход из группы
router.post('/group/:chatId/leave', async (req, res) => {
    const chatId = parseInt(req.params.chatId);
    const { userId } = req.body;
    
    try {
        const success = await leaveGroup(chatId, userId);
        if (!success) {
            return res.status(400).json({ error: 'Невозможно выйти из группы (вы создатель)' });
        }
        res.json({ message: 'Вы вышли из группы' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка выхода из группы' });
    }
});


export default router;