import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import db from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { messages, userId, provider } = await request.json();
    const cookieStore = await cookies();
    const apiKey = cookieStore.get('ai_key')?.value;

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

    const courseContext = `Course Modules context:
1. Basics of the Stock Market: Buyers/sellers trade shares, prices change based on supply/demand.
2. How to Make a Trade: Search symbol, Buy at current price (deducts from cash, adds to portfolio), Sell to take profit.
3. Market vs Limit Orders: Market orders happen immediately at current price. Limit orders set a specific price to buy at.`;

    const systemPrompt = `You are an expert, friendly trading mentor guiding a ${user.experience_level} student.
Your MUST communicate in the user's preferred language: ${user.language}.
Your goal is to teach them how to trade stocks, crypto, and forex using a paper trading account based on the provided Course Modules.
Course Context: ${courseContext}
User Activity Context: ${tradesContext}
Never give actual financial advice; remind them this is a paper trading learning environment.`;

    // Dynamic Provider Setup (BYOK)
    let model;

    if (!apiKey) {
       // Fallback mock if no API key provided by user
       const tradesText = recentTrades.length > 0
          ? "I see you've been trading " + (recentTrades as any[]).map(t => t.symbol).join(', ') + "!"
          : "You haven't made any trades yet. Read the modules on the left, then head to the dashboard to search for a stock like AAPL and buy your first share!";

       const mockResponse = `Hello! I am your AI Mentor simulator.\n\nYou selected ${user?.language} as your language. ${tradesText}\n\nTo enable full AI mode to ask questions about the course modules on the left, please click 'AI Settings' above and provide your API Key (e.g., OpenAI, Anthropic, Google).`;

       return new Response(mockResponse, {
           headers: { 'Content-Type': 'text/plain; charset=utf-8' }
       });
    }

    try {
        switch (provider) {
            case 'openai':
                const customOpenAI = createOpenAI({ apiKey });
                model = customOpenAI('gpt-4o-mini');
                break;
            case 'anthropic':
                const customAnthropic = createAnthropic({ apiKey });
                model = customAnthropic('claude-3-haiku-20240307');
                break;
            case 'google':
                const customGoogle = createGoogleGenerativeAI({ apiKey });
                model = customGoogle('gemini-1.5-flash');
                break;
            case 'openrouter':
                const openRouter = createOpenAI({ baseURL: 'https://openrouter.ai/api/v1', apiKey });
                model = openRouter('mistralai/mistral-7b-instruct:free'); // Default fast free model
                break;
            default:
                const defaultOpenAI = createOpenAI({ apiKey });
                model = defaultOpenAI('gpt-4o-mini');
        }

        const result = await streamText({
            model,
            system: systemPrompt,
            messages,
        });

        return result.toTextStreamResponse();

    } catch (apiErr: any) {
         console.error('API Provider Error:', apiErr.message);
         return NextResponse.json({ error: `AI Provider Error: ${apiErr.message}. Please check your API key.` }, { status: 400 });
    }

  } catch (error: any) {
    console.error('AI chat error:', error);
    return NextResponse.json({ error: 'Failed to generate response. Please verify your settings.' }, { status: 500 });
  }
}
