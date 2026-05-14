import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { SocketManager } from './socket/socketManager';
import { testDatabaseConnection, initDatabase } from './db';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import contactsRoutes from './routes/contactsRoutes';
import chatRoutes from './routes/chatRoutes';
import uploadRoutes from './routes/uploadRoutes';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"],
        credentials: true
    }
});

app.use(cors());
app.use(express.json());

// Middleware для передачи ID пользователя из фронтенда (временно)
app.use((req, res, next) => {
    const userId = req.headers['x-user-id'];
    if (userId) {
        console.log(`Request from user: ${userId}`);
    }
    next();
});

// Подключаем маршруты
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/contacts', contactsRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/upload', uploadRoutes);

app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date() });
});

const socketManager = new SocketManager(io);
socketManager.initialize();

const PORT = process.env.PORT || 3001;

import fs from 'fs';
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

httpServer.listen(PORT, async () => {
    console.log(`Сервер запущен на порту ${PORT}`);
    console.log(`Socket.IO готов к подключениям`);
    console.log(`Загрузки сохраняются в: ${uploadsDir}`);

    
    await testDatabaseConnection();
    await initDatabase();
});
export { app, io, socketManager, httpServer };