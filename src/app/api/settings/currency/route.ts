import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getExchangeRate, convertAmount } from '@/lib/options';

export async function POST(request: Request) {
  try {
    const { userId, currency } = await request.json();

    if (!userId || !currency || (currency !== 'USD' && currency !== 'INR')) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const tx = await db.transaction('write');
    try {
      // Get current user details
      const userResult = await tx.execute({
        sql: 'SELECT balance, currency FROM users WHERE id = ?',
        args: [userId]
      });
      const user = userResult.rows[0] as unknown as { balance: number; currency: string } | undefined;

      if (!user) {
        throw new Error('User not found');
      }

      if (user.currency !== currency) {
        const rate = await getExchangeRate();
        const newBalance = convertAmount(user.balance, user.currency as 'USD' | 'INR', currency, rate);

        // Update user
        await tx.execute({
          sql: 'UPDATE users SET balance = ?, currency = ? WHERE id = ?',
          args: [newBalance, currency, userId]
        });

        await tx.commit();
        return NextResponse.json({ success: true, balance: newBalance, currency });
      }

      await tx.rollback();
      return NextResponse.json({ success: true, balance: user.balance, currency });
    } catch (err: any) {
      await tx.rollback();
      throw err;
    }
  } catch (error: any) {
    console.error('Settings currency update error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update currency' }, { status: 500 });
  }
}
