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

// Добавляем интерфейс для файла
interface MessageFile {
    id: number;
    file_name: string;
    file_path: string;
    file_size: number;
    file_type: string;
    mime_type: string;
}

export class MessageHandler {
    private io: Server;
    private connectedUsers: Map<string, ConnectedUser>;
    private userSockets: Map<number, string[]>;
    private chats: Map<string, Chat>;
    private messages: Map<string, Message[]>;

    constructor(io: Server) {
        this.io = io;
        this.connectedUsers = new Map();
        this.userSockets = new Map();
        this.chats = new Map();
        this.messages = new Map();
        this.initializeDemoChats();
    }

    private initializeDemoChats(): void {
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
        
        this.connectedUsers.set(socket.id, {
            socketId: socket.id,
            userId: userId,
            userName: userName,
            chatRooms: new Set()
        });
        
        if (!this.userSockets.has(userIdNum)) {
            this.userSockets.set(userIdNum, []);
        }
        this.userSockets.get(userIdNum)!.push(socket.id);
        
        socket.join(chatId);
        this.connectedUsers.get(socket.id)?.chatRooms.add(chatId);
        
        try {
            const chatMessages = await getChatMessages(parseInt(chatId), 100, 0, userIdNum);
            const formattedMessages = chatMessages.map((msg: any) => ({
                id: msg.id.toString(),
                text: msg.text,
                senderId: msg.sender_id.toString(),
                senderName: msg.sender_name || 'Unknown',
                chatId: msg.chat_id.toString(),
                timestamp: msg.created_at,
                reactions: msg.reactions?.map((r: any) => ({
                    reaction: r.reaction,
                    user_id: r.user_id,
                    user_name: r.user_name
                })) || [],
                userReaction: msg.user_reaction,
                files: msg.files?.map((file: MessageFile) => ({
                    id: file.id,
                    file_name: file.file_name,
                    file_path: file.file_path,
                    file_size: file.file_size,
                    file_type: file.file_type,
                    mime_type: file.mime_type
                })) || []
            }));
            socket.emit('chat_history', formattedMessages);
        } catch (err) {
            console.error('Ошибка загрузки истории:', err);
            socket.emit('chat_history', []);
        }
        
        socket.to(chatId).emit('user_connected', {
            userId,
            userName,
            message: `${userName} присоединился к чату`
        });
        
        this.sendOnlineUsers(chatId);
    }

    private async handleAddReaction(socket: Socket, data: { messageId: string; userId: number; reaction: string; chatId: string }): Promise<void> {
        const { messageId, userId, reaction, chatId } = data;
        console.log(`add_reaction: messageId=${messageId}, userId=${userId}, reaction=${reaction}, chatId=${chatId}`);
        try {
            const success = await setReaction(parseInt(messageId), userId, reaction);
            if (success) {
                const reactions = await getMessageReactions(parseInt(messageId));
                const formattedReactions = reactions.map((r: any) => ({
                    reaction: r.reaction,
                    user_id: r.user_id,
                    user_name: r.user_name
                }));
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
                const formattedReactions = reactions.map((r: any) => ({
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
            const savedMessage = await saveMessage(parseInt(chatId), parseInt(senderId), text);
            
            if (savedMessage) {
                const newMessage = {
                    id: savedMessage.id.toString(),
                    text: savedMessage.text,
                    senderId: savedMessage.sender_id.toString(),
                    senderName: senderName,
                    chatId: savedMessage.chat_id.toString(),
                    timestamp: savedMessage.created_at,
                    reactions: [],
                    files: []
                };
                
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
            const userIdNum = parseInt(user.userId);
            const sockets = this.userSockets.get(userIdNum);
            if (sockets) {
                const index = sockets.indexOf(socket.id);
                if (index !== -1) sockets.splice(index, 1);
                if (sockets.length === 0) {
                    this.userSockets.delete(userIdNum);
                }
            }
            
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

    public getChats(): Chat[] {
        return Array.from(this.chats.values());
    }

    public getUsersCount(): number {
        const uniqueUsers = new Set<string>();
        this.connectedUsers.forEach(user => {
            uniqueUsers.add(user.userId);
        });
        return uniqueUsers.size;
    }

    public getMessages(chatId: string): Message[] {
        return this.messages.get(chatId) || [];
    }
}