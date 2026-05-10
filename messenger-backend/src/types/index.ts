export interface User {
    id: number;
    name: string;
    email: string;
    tag: string;
    phone?: string;
    bio?: string;
    avatar_url?: string;
    is_phone_visible: boolean;
    is_email_visible: boolean;
    created_at?: Date;
    updated_at?: Date;
}


export interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  chatId: string;
  timestamp: Date;
  isOwn?: boolean;
}

export interface Chat {
  id: string;
  name: string;
  participants: User[];
  lastMessage?: Message;
  createdAt: Date;
}

export interface SocketEventMap {
  'join': { userId: string; chatId?: string };
  'send_message': Message;
  'new_message': Message;
  'typing': { chatId: string; userId: string; isTyping: boolean };
  'user_typing': { chatId: string; userId: string; userName: string; isTyping: boolean };
  'disconnect': { userId: string };
  'user_connected': { userId: string; userName: string };
  'user_disconnected': { userId: string; userName: string };
}

export interface ConnectedUser {
  socketId: string;
  userId: string;
  userName: string;
  chatRooms: Set<string>;
}