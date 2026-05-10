import { Router } from 'express';
import { addContact, removeContact, getContacts, isContact } from '../db/userQueries';

const router = Router();

// Получение списка контактов
router.get('/:userId', async (req, res) => {
    const userId = parseInt(req.params.userId);
    
    try {
        const contacts = await getContacts(userId);
        res.json(contacts);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Добавление в контакты
router.post('/:userId/add/:contactId', async (req, res) => {
    const userId = parseInt(req.params.userId);
    const contactId = parseInt(req.params.contactId);
    
    try {
        const success = await addContact(userId, contactId);
        if (!success) {
            return res.status(400).json({ error: 'Не удалось добавить в контакты' });
        }
        res.json({ message: 'Пользователь добавлен в контакты' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Удаление из контактов
router.delete('/:userId/remove/:contactId', async (req, res) => {
    const userId = parseInt(req.params.userId);
    const contactId = parseInt(req.params.contactId);
    
    try {
        const success = await removeContact(userId, contactId);
        if (!success) {
            return res.status(400).json({ error: 'Не удалось удалить из контактов' });
        }
        res.json({ message: 'Пользователь удалён из контактов' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Проверка наличия в контактах
router.get('/:userId/check/:contactId', async (req, res) => {
    const userId = parseInt(req.params.userId);
    const contactId = parseInt(req.params.contactId);
    
    try {
        const isContact_ = await isContact(userId, contactId);
        res.json({ isContact: isContact_ });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

export default router;