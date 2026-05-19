import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';
import { NextResponse } from 'next/server';

// Mock the AI providers
vi.mock('@ai-sdk/openai', () => ({
  createOpenAI: vi.fn().mockImplementation(() => {
    return vi.fn().mockReturnValue('mocked-openai-model');
  })
}));

vi.mock('@ai-sdk/anthropic', () => ({
  createAnthropic: vi.fn().mockImplementation(() => {
    return vi.fn().mockReturnValue('mocked-anthropic-model');
  })
}));

vi.mock('@ai-sdk/google', () => ({
  createGoogleGenerativeAI: vi.fn().mockImplementation(() => {
    return vi.fn().mockReturnValue('mocked-google-model');
  })
}));

// Mock streamText
vi.mock('ai', () => ({
  streamText: vi.fn().mockResolvedValue({
    toTextStreamResponse: vi.fn().mockReturnValue(new Response('mocked-stream'))
  })
}));

// Mock db
const mockExecute = vi.fn();

vi.mock('@/lib/db', () => ({
  default: {
    execute: (...args: any[]) => mockExecute(...args),
  }
}));

// Helper to create mock requests
function createMockRequest(body: any) {
  // Mock cookies get for API Key (if provided in request body for mock purposes)
  return {
    json: vi.fn().mockResolvedValue(body)
  } as unknown as Request;
}

// We mock cookies to return ai_key if apiKey is in request body
vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    get: (name: string) => {
      // In the tests we pass apiKey in request, so we can mock this dynamically if needed, 
      // or we can mock it here. Let's return a value if we want to simulate having an API key.
      return null; // By default no key, we will override it in test cases using spy/mock
    }
  })
}));

import { cookies } from 'next/headers';

describe('POST /api/course/chat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 if userId is missing', async () => {
    const request = createMockRequest({ messages: [] });
    const response = await POST(request);

    expect(response).toBeInstanceOf(NextResponse);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('User ID is required');
  });

  it('returns 404 if user is not found', async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] }); // User not found
    const request = createMockRequest({ messages: [], userId: 'user-1' });
    const response = await POST(request);

    expect(response).toBeInstanceOf(NextResponse);
    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('User not found');
  });

  it('returns fallback mock response if apiKey is not provided', async () => {
    mockExecute.mockImplementation(async ({ sql }) => {
      if (sql.includes('FROM users')) {
        return { rows: [{ language: 'English', experience_level: 'beginner' }] };
      }
      return { rows: [] }; // no trades
    });

    vi.mocked(cookies).mockResolvedValueOnce({
      get: () => undefined
    } as any);

    const request = createMockRequest({ messages: [], userId: 'user-1' });
    const response = await POST(request);

    expect(response).toBeInstanceOf(Response);
    const text = await response.text();
    expect(text).toContain('Hello! I am your AI Mentor simulator.');
    expect(text).toContain("You haven't made any trades yet.");
  });

  it('returns fallback mock response with trades context if apiKey is not provided', async () => {
    mockExecute.mockImplementation(async ({ sql }) => {
      if (sql.includes('FROM users')) {
        return { rows: [{ language: 'Spanish', experience_level: 'expert' }] };
      }
      if (sql.includes('FROM transactions')) {
        return { rows: [{ symbol: 'AAPL', type: 'buy', shares: 10 }] };
      }
      return { rows: [] };
    });

    vi.mocked(cookies).mockResolvedValueOnce({
      get: () => undefined
    } as any);

    const request = createMockRequest({ messages: [], userId: 'user-1' });
    const response = await POST(request);

    expect(response).toBeInstanceOf(Response);
    const text = await response.text();
    expect(text).toContain('Hello! I am your AI Mentor simulator.');
    expect(text).toContain("I see you've been trading AAPL!");
  });

  it('successfully calls ai provider with openai', async () => {
    mockExecute.mockImplementation(async ({ sql }) => {
      if (sql.includes('FROM users')) {
        return { rows: [{ language: 'English', experience_level: 'beginner' }] };
      }
      return { rows: [] };
    });

    vi.mocked(cookies).mockResolvedValueOnce({
      get: () => ({ value: 'test-key' })
    } as any);

    const request = createMockRequest({
      messages: [{ role: 'user', content: 'hello' }],
      userId: 'user-1',
      provider: 'openai'
    });

    const response = await POST(request);
    expect(response).toBeInstanceOf(Response);
    const text = await response.text();
    expect(text).toBe('mocked-stream');

    const { streamText } = await import('ai');
    expect(streamText).toHaveBeenCalled();
  });

  it('successfully calls ai provider with anthropic', async () => {
    mockExecute.mockImplementation(async ({ sql }) => {
      if (sql.includes('FROM users')) {
        return { rows: [{ language: 'English', experience_level: 'beginner' }] };
      }
      return { rows: [] };
    });

    vi.mocked(cookies).mockResolvedValueOnce({
      get: () => ({ value: 'test-key' })
    } as any);

    const request = createMockRequest({
      messages: [{ role: 'user', content: 'hello' }],
      userId: 'user-1',
      provider: 'anthropic'
    });

    const response = await POST(request);
    expect(response).toBeInstanceOf(Response);

    const { streamText } = await import('ai');
    expect(streamText).toHaveBeenCalled();
  });

  it('successfully calls ai provider with google', async () => {
    mockExecute.mockImplementation(async ({ sql }) => {
      if (sql.includes('FROM users')) {
        return { rows: [{ language: 'English', experience_level: 'beginner' }] };
      }
      return { rows: [] };
    });

    vi.mocked(cookies).mockResolvedValueOnce({
      get: () => ({ value: 'test-key' })
    } as any);

    const request = createMockRequest({
      messages: [{ role: 'user', content: 'hello' }],
      userId: 'user-1',
      provider: 'google'
    });

    const response = await POST(request);
    expect(response).toBeInstanceOf(Response);

    const { streamText } = await import('ai');
    expect(streamText).toHaveBeenCalled();
  });

  it('successfully calls ai provider with openrouter', async () => {
    mockExecute.mockImplementation(async ({ sql }) => {
      if (sql.includes('FROM users')) {
        return { rows: [{ language: 'English', experience_level: 'beginner' }] };
      }
      return { rows: [] };
    });

    vi.mocked(cookies).mockResolvedValueOnce({
      get: () => ({ value: 'test-key' })
    } as any);

    const request = createMockRequest({
      messages: [{ role: 'user', content: 'hello' }],
      userId: 'user-1',
      provider: 'openrouter'
    });

    const response = await POST(request);
    expect(response).toBeInstanceOf(Response);

    const { streamText } = await import('ai');
    expect(streamText).toHaveBeenCalled();
  });

  it('successfully calls ai provider with default fallback (unknown provider)', async () => {
    mockExecute.mockImplementation(async ({ sql }) => {
      if (sql.includes('FROM users')) {
        return { rows: [{ language: 'English', experience_level: 'beginner' }] };
      }
      return { rows: [] };
    });

    vi.mocked(cookies).mockResolvedValueOnce({
      get: () => ({ value: 'test-key' })
    } as any);

    const request = createMockRequest({
      messages: [{ role: 'user', content: 'hello' }],
      userId: 'user-1',
      provider: 'unknown'
    });

    const response = await POST(request);
    expect(response).toBeInstanceOf(Response);

    const { streamText } = await import('ai');
    expect(streamText).toHaveBeenCalled();
  });

  it('handles provider error', async () => {
    mockExecute.mockImplementation(async ({ sql }) => {
      if (sql.includes('FROM users')) {
        return { rows: [{ language: 'English', experience_level: 'beginner' }] };
      }
      return { rows: [] };
    });

    vi.mocked(cookies).mockResolvedValueOnce({
      get: () => ({ value: 'test-key' })
    } as any);

    const { streamText } = await import('ai');
    (streamText as any).mockRejectedValueOnce(new Error('Invalid API Key'));

    const request = createMockRequest({
      messages: [{ role: 'user', content: 'hello' }],
      userId: 'user-1',
      provider: 'openai'
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('AI Provider Error');
  });

  it('handles general errors (e.g. invalid json)', async () => {
    // request.json() will reject
    const request = {
      json: vi.fn().mockRejectedValue(new Error('Invalid JSON'))
    } as unknown as Request;

    const response = await POST(request);
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Failed to generate response. Please verify your settings.');
  });
});
