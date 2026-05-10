import { Pool } from 'pg';

// Параметры подключения (можно заменить на свои или использовать переменные окружения)
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'messenger_db',   // название вашей БД
  user: 'admin',           // ваш пользователь
  password: 'password',       // ваш пароль
  max: 20,                    // максимальное количество клиентов в пуле
  idleTimeoutMillis: 30000,
});
export async function initDatabase(): Promise<void> {
    const client = await pool.connect();
}

export async function testDatabaseConnection(): Promise<void> {
    let client;
    try {
        client = await pool.connect();
        console.log('✅ Успешное подключение к PostgreSQL');
        const res = await client.query('SELECT NOW() as current_time');
        console.log(`📅 Текущее время БД: ${res.rows[0].current_time}`);
    } catch (err) {
        console.error('❌ Ошибка подключения к PostgreSQL:', err);
    } finally {
        if (client) client.release();
    }
}

export { pool };
