import { pool } from './index';

export interface User {
    id: number;
    name: string;
    email: string;
    phone?: string;
    password: string;
    tag: string;
    bio?: string;
    is_phone_visible: boolean;
    is_email_visible: boolean;
    created_at: Date;
    updated_at: Date;
}

export interface UserPublicInfo {
    id: number;
    name: string;
    tag: string;
    bio?: string;
    email?: string;
    phone?: string;
}

// Регистрация
export async function createUser(name: string, email: string, password: string, customTag?: string): Promise<User | null> {
    const client = await pool.connect();
    try {
        let tag = customTag;
        
        if (!tag) {
            // Если тег не указан, генерируем из имени
            let baseTag = name.toLowerCase().replace(/[^a-z0-9]/g, '');
            tag = baseTag;
            let counter = 1;
            
            let tagExists = true;
            while (tagExists) {
                const existing = await client.query('SELECT id FROM users WHERE tag = $1', [tag]);
                if (existing.rows.length === 0) {
                    tagExists = false;
                } else {
                    tag = `${baseTag}${counter}`;
                    counter++;
                }
            }
        } else {
            // Проверяем уникальность указанного тега
            const existing = await client.query('SELECT id FROM users WHERE tag = $1', [tag]);
            if (existing.rows.length > 0) {
                return null;
            }
        }
        
        const result = await client.query(
            `INSERT INTO users (name, email, password, tag) VALUES ($1, $2, $3, $4) 
             RETURNING id, name, email, tag, created_at`,
            [name, email, password, tag]
        );
        return result.rows[0];
    } catch (err: any) {
        if (err.code === '23505') {
            console.error('Email or tag already exists');
            return null;
        }
        throw err;
    } finally {
        client.release();
    }
}


// Поиск пользователя по email (для логина)
export async function getUserByEmail(email: string): Promise<User | null> {
    const client = await pool.connect();
    try {
        const result = await client.query(
            `SELECT * FROM users WHERE email = $1`,
            [email]
        );
        return result.rows[0] || null;
    } finally {
        client.release();
    }
}

export async function getUserById(id: number): Promise<User | null> {
    const client = await pool.connect();
    try {
        const result = await client.query(`SELECT * FROM users WHERE id = $1`, [id]);
        return result.rows[0] || null;
    } finally {
        client.release();
    }
}

export async function getUserPublicInfo(userId: number, viewerId?: number): Promise<UserPublicInfo | null> {
    const client = await pool.connect();
    try {
        const user = await getUserById(userId);
        if (!user) return null;
        
        const publicInfo: UserPublicInfo = {
            id: user.id,
            name: user.name,
            tag: user.tag || '',
            bio: user.bio
        };
        
        // Если смотрим свой профиль или зритель не указан (публичный запрос)
        if (viewerId === userId || !viewerId) {
            if (user.is_email_visible) publicInfo.email = user.email;
            if (user.is_phone_visible && user.phone) publicInfo.phone = user.phone;
        } else {
            const viewer = await getUserById(viewerId);
            if (viewer && viewer.id === userId) {
                if (user.is_email_visible) publicInfo.email = user.email;
                if (user.is_phone_visible && user.phone) publicInfo.phone = user.phone;
            }
        }
        
        return publicInfo;
    } finally {
        client.release();
    }
}

// Обновление профиля
export async function updateUser(userId: number, updates: {
    name?: string;
    phone?: string;
    bio?: string;
    is_phone_visible?: boolean;
    is_email_visible?: boolean;
}): Promise<User | null> {
    const client = await pool.connect();
    try {
        const fields: string[] = [];
        const values: any[] = [];
        let paramCounter = 1;
        
        if (updates.name !== undefined) {
            fields.push(`name = $${paramCounter++}`);
            values.push(updates.name);
        }
        if (updates.phone !== undefined) {
            fields.push(`phone = $${paramCounter++}`);
            values.push(updates.phone);
        }
        if (updates.bio !== undefined) {
            fields.push(`bio = $${paramCounter++}`);
            values.push(updates.bio);
        }
        if (updates.is_phone_visible !== undefined) {
            fields.push(`is_phone_visible = $${paramCounter++}`);
            values.push(updates.is_phone_visible);
        }
        if (updates.is_email_visible !== undefined) {
            fields.push(`is_email_visible = $${paramCounter++}`);
            values.push(updates.is_email_visible);
        }
        
        if (fields.length === 0) return null;
        
        values.push(userId);
        const query = `
            UPDATE users 
            SET ${fields.join(', ')} 
            WHERE id = $${paramCounter} 
            RETURNING *
        `;
        
        const result = await client.query(query, values);
        return result.rows[0] || null;
    } finally {
        client.release();
    }
}

// Обновление пароля
export async function updatePassword(userId: number, newPassword: string): Promise<boolean> {
    const client = await pool.connect();
    try {
        const result = await client.query(
            `UPDATE users SET password = $1 WHERE id = $2 RETURNING id`,
            [newPassword, userId]
        );
        return result.rows.length > 0;
    } finally {
        client.release();
    }
}

// Обновление тега
export async function updateTag(userId: number, newTag: string): Promise<boolean> {
    const client = await pool.connect();
    try {
        // Проверяем уникальность тега
        const existing = await client.query('SELECT id FROM users WHERE tag = $1 AND id != $2', [newTag, userId]);
        if (existing.rows.length > 0) return false;
        
        const result = await client.query(
            `UPDATE users SET tag = $1 WHERE id = $2 RETURNING id`,
            [newTag, userId]
        );
        return result.rows.length > 0;
    } finally {
        client.release();
    }
}

// Поиск пользователей по имени или тегу
export async function searchUsers(query: string, currentUserId: number): Promise<UserPublicInfo[]> {
    const client = await pool.connect();
    try {
        const searchQuery = `%${query.toLowerCase()}%`;
        const result = await client.query(
            `SELECT id, name, tag, bio, is_email_visible, is_phone_visible, email, phone
             FROM users 
             WHERE (LOWER(name) LIKE $1 OR LOWER(tag) LIKE $1) AND id != $2
             LIMIT 20`,
            [searchQuery, currentUserId]
        );
        
        return result.rows.map(row => ({
            id: row.id,
            name: row.name,
            tag: row.tag,
            bio: row.bio,
            ...(row.is_email_visible && { email: row.email }),
            ...(row.is_phone_visible && row.phone && { phone: row.phone })
        }));
    } finally {
        client.release();
    }
}

export async function addContact(userId: number, contactId: number): Promise<boolean> {
    const client = await pool.connect();
    try {
        if (userId === contactId) return false;
        
        // Проверяем, существует ли пользователь
        const userExists = await client.query('SELECT id FROM users WHERE id = $1', [contactId]);
        if (userExists.rows.length === 0) return false;
        
        await client.query(
            `INSERT INTO contacts (user_id, contact_id) VALUES ($1, $2) 
             ON CONFLICT (user_id, contact_id) DO NOTHING`,
            [userId, contactId]
        );
        return true;
    } catch (err) {
        console.error(err);
        return false;
    } finally {
        client.release();
    }
}

export async function removeContact(userId: number, contactId: number): Promise<boolean> {
    const client = await pool.connect();
    try {
        const result = await client.query(
            `DELETE FROM contacts WHERE user_id = $1 AND contact_id = $2`,
            [userId, contactId]
        );
        return (result.rowCount || 0) > 0;
    } finally {
        client.release();
    }
}

export async function getContacts(userId: number): Promise<UserPublicInfo[]> {
    const client = await pool.connect();
    try {
        const result = await client.query(
            `SELECT u.id, u.name, u.tag, u.bio, u.is_email_visible, u.is_phone_visible, u.email, u.phone
             FROM contacts c
             JOIN users u ON c.contact_id = u.id
             WHERE c.user_id = $1
             ORDER BY u.name`,
            [userId]
        );
        
        return result.rows.map(row => ({
            id: row.id,
            name: row.name,
            tag: row.tag,
            bio: row.bio,
            ...(row.is_email_visible && { email: row.email }),
            ...(row.is_phone_visible && row.phone && { phone: row.phone })
        }));
    } finally {
        client.release();
    }
}

export async function isContact(userId: number, contactId: number): Promise<boolean> {
    const client = await pool.connect();
    try {
        const result = await client.query(
            `SELECT id FROM contacts WHERE user_id = $1 AND contact_id = $2`,
            [userId, contactId]
        );
        return result.rows.length > 0;
    } finally {
        client.release();
    }
}
