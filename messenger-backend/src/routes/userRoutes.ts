import { Router } from 'express';
import {searchUsers } from '../db/userQueries';

const router = Router();

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