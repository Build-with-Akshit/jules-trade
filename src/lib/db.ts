import { createClient } from '@libsql/client';

const isTest = process.env.NODE_ENV === 'test';

const url = isTest 
  ? 'file::memory:' 
  : (process.env.TURSO_DATABASE_URL || 'file:local.db');

const authToken = isTest 
  ? undefined 
  : process.env.TURSO_AUTH_TOKEN;

const db = createClient({
  url,
  authToken,
});

// Initialize database tables asynchronously
export async function initDb() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      login_code TEXT UNIQUE NOT NULL,
      balance REAL DEFAULT 100000.00,
      language TEXT DEFAULT 'English',
      experience_level TEXT DEFAULT 'Beginner',
      currency TEXT DEFAULT 'USD',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  try {
    await db.execute(`ALTER TABLE users ADD COLUMN currency TEXT DEFAULT 'USD'`);
  } catch (e) {
    // Column already exists, ignore
  }

  await db.execute(`
    CREATE TABLE IF NOT EXISTS portfolio (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      symbol TEXT NOT NULL,
      shares REAL NOT NULL,
      average_price REAL NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users (id),
      UNIQUE(user_id, symbol)
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      symbol TEXT NOT NULL,
      type TEXT NOT NULL, -- 'BUY' or 'SELL'
      shares REAL NOT NULL,
      price REAL NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS pending_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      symbol TEXT NOT NULL,
      type TEXT NOT NULL, -- 'BUY' or 'SELL'
      order_type TEXT NOT NULL, -- 'LIMIT' or 'STOP_LOSS'
      shares REAL NOT NULL,
      price REAL NOT NULL,
      status TEXT DEFAULT 'PENDING', -- 'PENDING', 'EXECUTED', 'CANCELLED'
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS course_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      module_id TEXT NOT NULL,
      completed BOOLEAN DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users (id),
      UNIQUE(user_id, module_id)
    )
  `);
}

// Automatically initialize tables when imported
initDb().catch(err => {
  console.error('Failed to initialize database tables:', err);
});

export default db;
