import { Server } from 'socket.io';
import { MessageHandler } from './messageHandler';

export class SocketManager {
    private io: Server;
    private messageHandler: MessageHandler;

    constructor(io: Server) {
        this.io = io;
        this.messageHandler = new MessageHandler(io);
        this.setupMiddleware();
    }

    private setupMiddleware(): void {
        this.io.use((socket, next) => {
            console.log(`Socket middleware: ${socket.id}`);
            next();
        });
    }

    public initialize(): void {
        this.io.on('connection', (socket) => {
            this.messageHandler.handleConnection(socket);
        });
        console.log('Socket.IO сервер запущен');
    }

    public getStats(): { usersCount: number; chatsCount: number } {
        const chats = this.messageHandler.getChats();
        const usersCount = this.messageHandler.getUsersCount();
        
        return {
            usersCount: usersCount,
            chatsCount: chats.length
        };
    }
}