import { Server, Socket } from 'socket.io';
import { Message, ConnectedUser, Chat } from '../types';
import { 
    saveMessage, 
    getChatMessages, 
    getChatById, 
    getUserChats,
    setReaction,
    removeReaction,
    getMessageReactions
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

        // Обработка реакций
        socket.on('add_reaction', async (data: { messageId: string; userId: number; reaction: string; chatId: string }) => {
            await this.handleAddReaction(socket, data);
        });

        socket.on('remove_reaction', async (data: { messageId: string; userId: number; chatId: string }) => {
            await this.handleRemoveReaction(socket, data);
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
                timestamp: msg.created_at,
                reactions: msg.reactions?.map(r => ({
                    reaction: r.reaction,
                    userId: r.user_id,
                    userName: r.user_name
                })) || [],
                userReaction: msg.user_reaction
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


    private async loadReactionsForMessages(socket: Socket, messageIds: number[]): Promise<void> {
        try {
            for (const messageId of messageIds) {
                const reactions = await getMessageReactions(messageId);
                socket.emit('reactions_loaded', {
                    messageId: messageId.toString(),
                    reactions: reactions.map(r => ({
                        reaction: r.reaction,
                        userId: r.user_id,
                        userName: r.user_name
                    }))
                });
            }
        } catch (err) {
            console.error('Ошибка загрузки реакций:', err);
        }
    }

    private async handleAddReaction(socket: Socket, data: { messageId: string; userId: number; reaction: string; chatId: string }): Promise<void> {
        const { messageId, userId, reaction, chatId } = data;
        console.log(`add_reaction: messageId=${messageId}, userId=${userId}, reaction=${reaction}, chatId=${chatId}`);
        try {
            const success = await setReaction(parseInt(messageId), userId, reaction);
            if (success) {
                const reactions = await getMessageReactions(parseInt(messageId));
                const formattedReactions = reactions.map(r => ({
                    reaction: r.reaction,
                    user_id: r.user_id,
                    user_name: r.user_name
                }));
                // Отправляем событие всем в комнате чата, включая отправителя
                this.io.to(chatId).emit('reaction_added', {
                    messageId,
                    reactions: formattedReactions,
                    userId,
                    reaction
                });
                console.log(`Reaction added, emitted to room ${chatId}`);
            } else {
                console.error('Failed to set reaction');
            }
        } catch (err) {
            console.error('Ошибка добавления реакции:', err);
            socket.emit('reaction_error', { message: 'Ошибка добавления реакции' });
        }
    }


    private async handleRemoveReaction(socket: Socket, data: { messageId: string; userId: number; chatId: string }): Promise<void> {
        const { messageId, userId, chatId } = data;
        try {
            const success = await removeReaction(parseInt(messageId), userId);
            if (success) {
                const reactions = await getMessageReactions(parseInt(messageId));
                const formattedReactions = reactions.map(r => ({
                    reaction: r.reaction,
                    user_id: r.user_id,
                    user_name: r.user_name
                }));
                this.io.to(chatId).emit('reaction_removed', {
                    messageId,
                    reactions: formattedReactions,
                    userId
                });
            }
        } catch (err) {
            console.error('Ошибка удаления реакции:', err);
            socket.emit('reaction_error', { message: 'Ошибка удаления реакции' });
        }
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