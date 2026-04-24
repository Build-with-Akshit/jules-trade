import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import db, { initDb } from './db';

describe('Database Initialization', () => {
  // Although db.ts calls initDb() upon import, we can safely call it again
  // to ensure its idempotency.

  beforeEach(() => {
    // We could clean up or reset tables here if needed,
    // but the tables have IF NOT EXISTS, so running initDb is safe.
    // For pure unit testing of initDb, we just ensure it executes.
  });

  afterEach(() => {
    // Optionally clean up
  });

  it('should initialize tables without throwing errors', () => {
    expect(() => initDb()).not.toThrow();
  });

  it('should have created the necessary tables', () => {
    // Verify the tables exist by querying the sqlite_master table
    const stmt = db.prepare(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name IN ('users', 'portfolio', 'transactions', 'course_progress')
    `);

    const tables = stmt.all() as { name: string }[];
    const tableNames = tables.map((t) => t.name);

    expect(tableNames).toContain('users');
    expect(tableNames).toContain('portfolio');
    expect(tableNames).toContain('transactions');
    expect(tableNames).toContain('course_progress');
    expect(tableNames).toHaveLength(4);
  });

  it('should be idempotent (calling initDb multiple times should not fail)', () => {
    expect(() => {
      initDb();
      initDb();
      initDb();
    }).not.toThrow();
  });
});
