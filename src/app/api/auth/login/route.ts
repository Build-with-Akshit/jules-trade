import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { loginCode } = await request.json();

    if (!loginCode) {
      return NextResponse.json({ success: false, error: 'Login code is required' }, { status: 400 });
    }

    const stmt = db.prepare('SELECT id, login_code, balance, language, experience_level FROM users WHERE login_code = ?');
    const user = stmt.get(loginCode.toUpperCase());

    if (!user) {
      return NextResponse.json({ success: false, error: 'Invalid login code' }, { status: 401 });
    }

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ success: false, error: 'Failed to authenticate' }, { status: 500 });
  }
}
