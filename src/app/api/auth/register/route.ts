import { NextResponse } from 'next/server';
import db from '@/lib/db';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const { language, experienceLevel } = await request.json();

    // Generate a secure 12-character alphanumeric code
    const loginCode = crypto.randomBytes(6).toString('hex').toUpperCase();

    const info = await db.execute({
      sql: `INSERT INTO users (login_code, language, experience_level) VALUES (?, ?, ?)`,
      args: [loginCode, language || 'English', experienceLevel || 'Beginner']
    });

    // info.lastInsertRowid may be a bigint, convert to number safely
    const userId = info.lastInsertRowid ? Number(info.lastInsertRowid) : null;

    return NextResponse.json({
      success: true,
      loginCode,
      userId
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create user' }, { status: 500 });
  }
}
