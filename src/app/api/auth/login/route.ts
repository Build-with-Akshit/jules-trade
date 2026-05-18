import { NextResponse } from 'next/server';
import db from '@/lib/db';

// In-memory rate limiting map: IP -> { count, resetTime }
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_TIME = 15 * 60 * 1000; // 15 minutes

// Clean up expired rate limits periodically to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [ip, info] of rateLimitMap.entries()) {
    if (now >= info.resetTime) {
      rateLimitMap.delete(ip);
    }
  }
}, 5 * 60 * 1000); // Check every 5 minutes

export async function POST(request: Request) {
  try {
    // Basic IP extraction for rate limiting
    const ip = request.headers.get('x-forwarded-for') ||
               request.headers.get('x-real-ip') ||
               'unknown';

    const now = Date.now();
    const rateLimitInfo = rateLimitMap.get(ip);

    if (rateLimitInfo) {
      if (now < rateLimitInfo.resetTime) {
        if (rateLimitInfo.count >= MAX_ATTEMPTS) {
          return NextResponse.json(
            { success: false, error: 'Too many login attempts. Please try again later.' },
            { status: 429 }
          );
        }
      } else {
        // Reset if lockout time has passed
        rateLimitMap.delete(ip);
      }
    }

    const { loginCode } = await request.json();

    if (!loginCode) {
      return NextResponse.json({ success: false, error: 'Login code is required' }, { status: 400 });
    }

    const stmt = db.prepare('SELECT id, login_code, balance, language, experience_level FROM users WHERE login_code = ?');
    const user = stmt.get(loginCode.toUpperCase());

    if (!user) {
      // Record failed attempt
      const currentRateLimitInfo = rateLimitMap.get(ip) || { count: 0, resetTime: now + LOCKOUT_TIME };
      currentRateLimitInfo.count += 1;
      // Reset the timer on each failed attempt
      currentRateLimitInfo.resetTime = now + LOCKOUT_TIME;
      rateLimitMap.set(ip, currentRateLimitInfo);

      return NextResponse.json({ success: false, error: 'Invalid login code' }, { status: 401 });
    }

    // Reset rate limits on successful login
    rateLimitMap.delete(ip);

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ success: false, error: 'Failed to authenticate' }, { status: 500 });
  }
}
