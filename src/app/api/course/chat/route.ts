import { NextResponse } from 'next/server';
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import db from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { messages, userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Get user details
    const userStmt = db.prepare('SELECT language, experience_level FROM users WHERE id = ?');
    const user = userStmt.get(userId) as { language: string, experience_level: string } | undefined;

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get recent user trades to personalize context
    const tradesStmt = db.prepare('SELECT symbol, type, shares FROM transactions WHERE user_id = ? ORDER BY timestamp DESC LIMIT 5');
    const recentTrades = tradesStmt.all(userId);
    const tradesContext = recentTrades.length > 0
      ? `Recent user trades: ${JSON.stringify(recentTrades)}.`
      : 'User has no trades yet. Encourage them to make their first paper trade!';

    const systemPrompt = `You are an expert, friendly trading mentor guiding a ${user.experience_level} student.
Your MUST communicate in the user's preferred language: ${user.language}.
Your goal is to teach them how to trade stocks, crypto, and forex using a paper trading account.
Be highly encouraging, use simple analogies, and provide step-by-step guidance like a personalized course.
Here is context about their recent activity: ${tradesContext}
Never give actual financial advice; remind them this is a paper trading learning environment.`;

    if (process.env.OPENAI_API_KEY) {
        const result = await streamText({
          model: openai('gpt-4o-mini'),
          system: systemPrompt,
          messages,
        });

        return result.toTextStreamResponse();
    } else {
        const tradesText = recentTrades.length > 0
          ? "I see you've been trading " + (recentTrades as any[]).map(t => t.symbol).join(', ') + "!"
          : "You haven't made any trades yet. Head to the dashboard to search for a stock like AAPL and buy your first share!";

        const mockResponse = `Hello! I am your AI Mentor simulator (OpenAI API key not configured or AI package mismatch). \n\nYou selected ${user?.language} as your language. ${tradesText}\n\nTo enable full AI mode, set OPENAI_API_KEY in the environment and ensure the Vercel AI SDK is properly configured.`;

        // Send a single chunk containing the mock response so it behaves like a stream from the frontend's perspective
        return new Response(mockResponse, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8'
            }
        });
    }
  } catch (error: any) {
    console.error('AI chat error:', error);
    // Return a graceful fallback if no API key is provided
    if (error.message && error.message.includes('API key')) {
      return NextResponse.json({
        error: 'OpenAI API key is missing. Please set OPENAI_API_KEY in your environment to enable the AI mentor.'
      }, { status: 500 });
    }
    return NextResponse.json({ error: 'Failed to generate response' }, { status: 500 });
  }
}
