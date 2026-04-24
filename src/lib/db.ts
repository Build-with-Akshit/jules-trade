import Database from 'better-sqlite3';
import path from 'path';

// Connect to an in-memory or file-based database
// Vercel serverless functions have a read-only filesystem except for /tmp
const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
const dbPath = isProduction
  ? path.join('/tmp', 'paper-trading.sqlite')
  : path.join(process.cwd(), 'paper-trading.sqlite');
const db = new Database(dbPath);

// Initialize database tables
export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      login_code TEXT UNIQUE NOT NULL,
      balance REAL DEFAULT 100000.00,
      language TEXT DEFAULT 'English',
      experience_level TEXT DEFAULT 'Beginner',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS portfolio (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      symbol TEXT NOT NULL,
      shares REAL NOT NULL,
      average_price REAL NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users (id),
      UNIQUE(user_id, symbol)
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      symbol TEXT NOT NULL,
      type TEXT NOT NULL, -- 'BUY' or 'SELL'
      shares REAL NOT NULL,
      price REAL NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    );

    CREATE TABLE IF NOT EXISTS course_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      module_id TEXT NOT NULL,
      completed BOOLEAN DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users (id),
      UNIQUE(user_id, module_id)
    );
  `);
}

// Automatically initialize tables when imported
initDb();

export default db;
