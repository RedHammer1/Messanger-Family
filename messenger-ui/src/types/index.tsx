// Централизованное определение типов

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

export interface ChatParticipant {
    id: number;
    name: string;
    tag: string;
    role: 'creator' | 'moderator' | 'member';
}

export interface MessageFile {
    id: number;
    message_id: number;
    file_name: string;
    file_path: string;
    file_size: number;
    file_type: 'image' | 'video' | 'document';
    mime_type: string;
    created_at: Date;
}

export interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  chatId: string;
  timestamp: Date;
  createdAt: Date;
  updatedAt?: Date;
  isOwn?: boolean;
  reactions?: any[];
  files?: any[];
  userReaction?: string;
}



export interface Chat {
    id: number;
    name: string | null;
    type: 'private' | 'group';
    created_by: number;
    created_at: Date;
    updated_at: Date;
     participants: ChatParticipant[];
    last_message?: {
        text: string;
        created_at: string;
        sender_name: string;
    };
}

export interface Contact {
    id: number;
    name: string;
    tag: string;
    bio?: string;
    email?: string;
    phone?: string;
}
