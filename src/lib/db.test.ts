import { describe, it, expect } from 'vitest';
import db, { initDb } from './db';

describe('Database Initialization', () => {
  it('should initialize tables without throwing errors', async () => {
    await expect(initDb()).resolves.not.toThrow();
  });

  it('should have created the necessary tables', async () => {
    // Verify the tables exist by querying the sqlite_master table
    const result = await db.execute(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name IN ('users', 'portfolio', 'transactions', 'course_progress')
    `);

    const tableNames = result.rows.map((row: any) => row.name);

    expect(tableNames).toContain('users');
    expect(tableNames).toContain('portfolio');
    expect(tableNames).toContain('transactions');
    expect(tableNames).toContain('course_progress');
    expect(tableNames).toHaveLength(4);
  });

  it('should be idempotent (calling initDb multiple times should not fail)', async () => {
    await expect((async () => {
      await initDb();
      await initDb();
      await initDb();
    })()).resolves.not.toThrow();
  });
});
