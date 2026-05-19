import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Use transaction to delete all user-related data permanently
    const tx = await db.transaction("write");
    try {
      // 1. Delete course progress
      await tx.execute({
        sql: 'DELETE FROM course_progress WHERE user_id = ?',
        args: [userId]
      });

      // 2. Delete portfolio holdings
      await tx.execute({
        sql: 'DELETE FROM portfolio WHERE user_id = ?',
        args: [userId]
      });

      // 3. Delete transaction history
      await tx.execute({
        sql: 'DELETE FROM transactions WHERE user_id = ?',
        args: [userId]
      });

      // 4. Delete user account
      await tx.execute({
        sql: 'DELETE FROM users WHERE id = ?',
        args: [userId]
      });

      await tx.commit();
      return NextResponse.json({ success: true });
    } catch (txError: any) {
      await tx.rollback();
      throw txError;
    }
  } catch (error: any) {
    console.error('Delete account error:', error);
    return NextResponse.json({ error: 'Failed to permanently delete account' }, { status: 500 });
  }
}
