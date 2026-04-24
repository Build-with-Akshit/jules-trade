import { NextResponse } from 'next/server';
import db from '@/lib/db';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const { language, experienceLevel } = await request.json();

    // Generate a secure 6-character alphanumeric code
    const loginCode = crypto.randomBytes(3).toString('hex').toUpperCase();

    const stmt = db.prepare(`
      INSERT INTO users (login_code, language, experience_level)
      VALUES (?, ?, ?)
    `);

    const info = stmt.run(loginCode, language || 'English', experienceLevel || 'Beginner');

    return NextResponse.json({
      success: true,
      loginCode,
      userId: info.lastInsertRowid
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create user' }, { status: 500 });
  }
}
