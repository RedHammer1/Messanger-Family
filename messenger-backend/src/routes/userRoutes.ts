import { Router } from 'express';
import { getUserById, updateUser, updatePassword, updateTag, searchUsers, getUserPublicInfo } from '../db/userQueries';

const router = Router();

// Получение профиля текущего пользователя
router.get('/profile/:userId', async (req, res) => {
    const userId = parseInt(req.params.userId);
    const currentUserId = req.headers['x-user-id'] ? parseInt(req.headers['x-user-id'] as string) : undefined;
    
    try {
        const user = await getUserPublicInfo(userId, currentUserId);
        if (!user) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }
        res.json(user);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Обновление профиля
router.put('/profile/:userId', async (req, res) => {
    const userId = parseInt(req.params.userId);
    const { name, phone, bio, is_phone_visible, is_email_visible } = req.body;
    
    try {
        const updated = await updateUser(userId, {
            name, phone, bio, is_phone_visible, is_email_visible
        });
        if (!updated) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }
        res.json({
            id: updated.id,
            name: updated.name,
            email: updated.email,
            phone: updated.phone,
            bio: updated.bio,
            tag: updated.tag,
            is_phone_visible: updated.is_phone_visible,
            is_email_visible: updated.is_email_visible
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Обновление пароля
router.put('/profile/:userId/password', async (req, res) => {
    const userId = parseInt(req.params.userId);
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Все поля обязательны' });
    }
    if (newPassword.length < 6) {
        return res.status(400).json({ error: 'Пароль должен содержать не менее 6 символов' });
    }
    
    try {
        // Проверяем текущий пароль
        const user = await getUserById(userId);
        if (!user || user.password !== currentPassword) {
            return res.status(401).json({ error: 'Неверный текущий пароль' });
        }
        
        const updated = await updatePassword(userId, newPassword);
        if (!updated) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }
        res.json({ message: 'Пароль успешно обновлён' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Обновление тега
router.put('/profile/:userId/tag', async (req, res) => {
    const userId = parseInt(req.params.userId);
    const { tag } = req.body;
    
    if (!tag) {
        return res.status(400).json({ error: 'Тег обязателен' });
    }
    
    // Проверяем формат тега
    const tagRegex = /^@[a-zA-Z0-9_]{3,30}$/;
    if (!tagRegex.test(tag)) {
        return res.status(400).json({ error: 'Тег должен начинаться с @ и содержать 3-30 символов (буквы, цифры, _)' });
    }
    
    try {
        const updated = await updateTag(userId, tag);
        if (!updated) {
            return res.status(400).json({ error: 'Такой тег уже существует' });
        }
        res.json({ tag, message: 'Тег успешно обновлён' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Поиск пользователей
router.get('/search', async (req, res) => {
    const query = req.query.q as string;
    const currentUserId = req.headers['x-user-id'] ? parseInt(req.headers['x-user-id'] as string) : 0;
    
    if (!query || query.length < 2) {
        return res.json([]);
    }
    
    try {
        const users = await searchUsers(query, currentUserId);
        res.json(users);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

export default router;