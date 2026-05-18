import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    // Await cookies() in Next.js 15+ if needed, but in 14 it's sync. In next 15 it's async.
    // The package.json says next is 16.2.4 (React 19), so cookies() is async!
    const cookieStore = await cookies();

    // Only update cookie if apiKey is explicitly provided in the payload
    if (body.apiKey !== undefined) {
      if (body.apiKey) {
        cookieStore.set('ai_key', body.apiKey, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          path: '/',
          maxAge: 60 * 60 * 24 * 30, // 30 days
        });
        return NextResponse.json({ success: true, hasKey: true });
      } else {
        cookieStore.delete('ai_key');
        return NextResponse.json({ success: true, hasKey: false });
      }
    }

    return NextResponse.json({ success: true, hasKey: cookieStore.has('ai_key') });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const cookieStore = await cookies();
    cookieStore.delete('ai_key');
    return NextResponse.json({ success: true, hasKey: false });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete settings' }, { status: 500 });
  }
}

export async function GET() {
  const cookieStore = await cookies();
  const hasKey = cookieStore.has('ai_key');
  return NextResponse.json({ hasKey });
}
