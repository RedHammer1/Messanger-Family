import { Router } from 'express';
import { createUser, getUserByEmail } from '../db/userQueries';

const router = Router();

// Регистрация
router.post('/register', async (req, res) => {
    const { name, email, password, tag } = req.body;

    if (!name || !email || !password || !tag) {
        return res.status(400).json({ error: 'Все поля обязательны (имя, email, пароль, тег)' });
    }
    
    // Проверяем формат тега
    const tagRegex = /^@[a-zA-Z0-9_]{3,30}$/;
    if (!tagRegex.test(tag)) {
        return res.status(400).json({ error: 'Тег должен начинаться с @ и содержать 3-30 символов (буквы, цифры, _)' });
    }

    try {
        const user = await createUser(name, email, password, tag);
        if (!user) {
            return res.status(400).json({ error: 'Пользователь с таким email или тегом уже существует' });
        }
        res.status(201).json({ id: user.id, name: user.name, email: user.email, tag: user.tag });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});


// Логин
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email и пароль обязательны' });
    }

    try {
        const user = await getUserByEmail(email);
        if (!user) {
            return res.status(401).json({ error: 'Неверный email или пароль' });
        }
        // Сравниваем пароль в открытом виде
        if (user.password !== password) {
            return res.status(401).json({ error: 'Неверный email или пароль' });
        }
        // Успешный вход
        res.json({ id: user.id, name: user.name, email: user.email });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

export default router;