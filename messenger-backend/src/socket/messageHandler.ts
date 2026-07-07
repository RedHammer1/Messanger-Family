import { Server, Socket } from 'socket.io';
import { Message, ConnectedUser, Chat } from '../types';
import { 
    saveMessage, 
    getChatMessages, 
    getChatById, 
    getUserChats
} from '../db/chatQueries';

export class MessageHandler {
    private io: Server;
    private connectedUsers: Map<string, ConnectedUser>;
    private userSockets: Map<number, string[]>; // userId -> socketIds
    private chats: Map<string, Chat>; // Для обратной совместимости
    private messages: Map<string, Message[]>; // Для обратной совместимости

    constructor(io: Server) {
        this.io = io;
        this.connectedUsers = new Map();
        this.userSockets = new Map();
        this.chats = new Map();
        this.messages = new Map();
        this.initializeDemoChats();
    }

    private initializeDemoChats(): void {
        // Инициализация для обратной совместимости
        const demoChat: Chat = {
            id: 'chat1',
            name: 'Общий чат',
            participants: [],
            createdAt: new Date()
        };
        this.chats.set('chat1', demoChat);
        this.messages.set('chat1', []);
    }

    public handleConnection(socket: Socket): void {
        console.log(`Пользователь подключился: ${socket.id}`);

        socket.on('join', async (data: { userId: string; userName: string; chatId: string }) => {
            await this.handleJoin(socket, data);
        });

        socket.on('send_message', async (messageData: { text: string; senderId: string; senderName: string; chatId: string }) => {
            await this.handleSendMessage(socket, messageData);
        });

        socket.on('typing', (data: { chatId: string; isTyping: boolean }) => {
            this.handleTyping(socket, data);
        });

        socket.on('disconnect', () => {
            this.handleDisconnect(socket);
        });
    }

    private async handleJoin(socket: Socket, data: { userId: string; userName: string; chatId: string }): Promise<void> {
        const { userId, userName, chatId } = data;
        const userIdNum = parseInt(userId);
        
        // Сохраняем пользователя
        this.connectedUsers.set(socket.id, {
            socketId: socket.id,
            userId: userId,
            userName: userName,
            chatRooms: new Set()
        });
        
        // Сохраняем соответствие userId -> socketId
        if (!this.userSockets.has(userIdNum)) {
            this.userSockets.set(userIdNum, []);
        }
        this.userSockets.get(userIdNum)!.push(socket.id);
        
        // Присоединяемся к комнате чата
        socket.join(chatId);
        this.connectedUsers.get(socket.id)?.chatRooms.add(chatId);
        
        // Отправляем историю сообщений из БД с реакциями
        try {
            const chatMessages = await getChatMessages(parseInt(chatId), 100, 0, userIdNum);
            const formattedMessages = chatMessages.map(msg => ({
                id: msg.id.toString(),
                text: msg.text,
                senderId: msg.sender_id.toString(),
                senderName: msg.sender_name || 'Unknown',
                chatId: msg.chat_id.toString(),
                timestamp: msg.created_at
            }));
            socket.emit('chat_history', formattedMessages);
        } catch (err) {
            console.error('Ошибка загрузки истории:', err);
            socket.emit('chat_history', []);
        }
        
        // Уведомляем всех в чате о новом пользователе
        socket.to(chatId).emit('user_connected', {
            userId,
            userName,
            message: `${userName} присоединился к чату`
        });
        
        // Отправляем список онлайн пользователей
        this.sendOnlineUsers(chatId);
    }

    private async handleSendMessage(socket: Socket, messageData: { text: string; senderId: string; senderName: string; chatId: string }): Promise<void> {
        const { text, senderId, senderName, chatId } = messageData;
        
        try {
            // Сохраняем сообщение в БД
            const savedMessage = await saveMessage(parseInt(chatId), parseInt(senderId), text);
            
            if (savedMessage) {
                const newMessage = {
                    id: savedMessage.id.toString(),
                    text: savedMessage.text,
                    senderId: savedMessage.sender_id.toString(),
                    senderName: senderName,
                    chatId: savedMessage.chat_id.toString(),
                    timestamp: savedMessage.created_at
                };
                
                // Отправляем сообщение всем в комнате
                this.io.to(chatId).emit('new_message', newMessage);
            }
        } catch (err) {
            console.error('Ошибка сохранения сообщения:', err);
        }
    }

    private handleTyping(socket: Socket, data: { chatId: string; isTyping: boolean }): void {
        const user = this.connectedUsers.get(socket.id);
        if (user) {
            socket.to(data.chatId).emit('user_typing', {
                chatId: data.chatId,
                userId: user.userId,
                userName: user.userName,
                isTyping: data.isTyping
            });
        }
    }

    private handleDisconnect(socket: Socket): void {
        const user = this.connectedUsers.get(socket.id);
        if (user) {
            // Удаляем socketId из маппинга
            const userIdNum = parseInt(user.userId);
            const sockets = this.userSockets.get(userIdNum);
            if (sockets) {
                const index = sockets.indexOf(socket.id);
                if (index !== -1) sockets.splice(index, 1);
                if (sockets.length === 0) {
                    this.userSockets.delete(userIdNum);
                }
            }
            
            // Уведомляем чаты о выходе пользователя
            user.chatRooms.forEach(chatId => {
                socket.to(chatId).emit('user_disconnected', {
                    userId: user.userId,
                    userName: user.userName,
                    message: `${user.userName} покинул чат`
                });
            });
            this.connectedUsers.delete(socket.id);
        }
        console.log(`Пользователь отключился: ${socket.id}`);
    }

    private sendOnlineUsers(chatId: string): void {
        const onlineUsers: { userId: string; userName: string }[] = [];
        this.connectedUsers.forEach(user => {
            if (user.chatRooms.has(chatId)) {
                onlineUsers.push({
                    userId: user.userId,
                    userName: user.userName
                });
            }
        });
        this.io.to(chatId).emit('online_users', onlineUsers);
    }

    // Метод для получения списка чатов (используется в socketManager.getStats)
    public getChats(): Chat[] {
        return Array.from(this.chats.values());
    }

    // Метод для получения количества уникальных пользователей
    public getUsersCount(): number {
        const uniqueUsers = new Set<string>();
        this.connectedUsers.forEach(user => {
            uniqueUsers.add(user.userId);
        });
        return uniqueUsers.size;
    }

    // Метод для получения сообщений чата (для обратной совместимости)
    public getMessages(chatId: string): Message[] {
        return this.messages.get(chatId) || [];
    }
}