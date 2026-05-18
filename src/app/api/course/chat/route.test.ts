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
const mockGet = vi.fn();
const mockAll = vi.fn();

vi.mock('@/lib/db', () => ({
  default: {
    prepare: vi.fn().mockImplementation((query) => {
      if (query.includes('SELECT language, experience_level FROM users')) {
        return { get: mockGet };
      }
      if (query.includes('SELECT symbol, type, shares FROM transactions')) {
        return { all: mockAll };
      }
      return { get: vi.fn(), all: vi.fn() };
    })
  }
}));

// Helper to create mock requests
function createMockRequest(body: any) {
  return {
    json: vi.fn().mockResolvedValue(body)
  } as unknown as Request;
}

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
    mockGet.mockReturnValueOnce(undefined);
    const request = createMockRequest({ messages: [], userId: 'user-1' });
    const response = await POST(request);

    expect(response).toBeInstanceOf(NextResponse);
    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('User not found');
  });

  it('returns fallback mock response if apiKey is not provided', async () => {
    mockGet.mockReturnValueOnce({ language: 'English', experience_level: 'beginner' });
    mockAll.mockReturnValueOnce([]); // no trades

    const request = createMockRequest({ messages: [], userId: 'user-1' });
    const response = await POST(request);

    expect(response).toBeInstanceOf(Response);
    const text = await response.text();
    expect(text).toContain('Hello! I am your AI Mentor simulator.');
    expect(text).toContain("You haven't made any trades yet.");
  });

  it('returns fallback mock response with trades context if apiKey is not provided', async () => {
    mockGet.mockReturnValueOnce({ language: 'Spanish', experience_level: 'expert' });
    mockAll.mockReturnValueOnce([{ symbol: 'AAPL', type: 'buy', shares: 10 }]); // has trades

    const request = createMockRequest({ messages: [], userId: 'user-1' });
    const response = await POST(request);

    expect(response).toBeInstanceOf(Response);
    const text = await response.text();
    expect(text).toContain('Hello! I am your AI Mentor simulator.');
    expect(text).toContain("I see you've been trading AAPL!");
  });

  it('successfully calls ai provider with openai', async () => {
    mockGet.mockReturnValueOnce({ language: 'English', experience_level: 'beginner' });
    mockAll.mockReturnValueOnce([]);

    const request = createMockRequest({
      messages: [{ role: 'user', content: 'hello' }],
      userId: 'user-1',
      provider: 'openai',
      apiKey: 'test-key'
    });

    const response = await POST(request);
    expect(response).toBeInstanceOf(Response);
    const text = await response.text();
    expect(text).toBe('mocked-stream');

    const { streamText } = await import('ai');
    expect(streamText).toHaveBeenCalled();
  });

  it('successfully calls ai provider with anthropic', async () => {
    mockGet.mockReturnValueOnce({ language: 'English', experience_level: 'beginner' });
    mockAll.mockReturnValueOnce([]);

    const request = createMockRequest({
      messages: [{ role: 'user', content: 'hello' }],
      userId: 'user-1',
      provider: 'anthropic',
      apiKey: 'test-key'
    });

    const response = await POST(request);
    expect(response).toBeInstanceOf(Response);

    const { streamText } = await import('ai');
    expect(streamText).toHaveBeenCalled();
  });

  it('successfully calls ai provider with google', async () => {
    mockGet.mockReturnValueOnce({ language: 'English', experience_level: 'beginner' });
    mockAll.mockReturnValueOnce([]);

    const request = createMockRequest({
      messages: [{ role: 'user', content: 'hello' }],
      userId: 'user-1',
      provider: 'google',
      apiKey: 'test-key'
    });

    const response = await POST(request);
    expect(response).toBeInstanceOf(Response);

    const { streamText } = await import('ai');
    expect(streamText).toHaveBeenCalled();
  });

  it('successfully calls ai provider with openrouter', async () => {
    mockGet.mockReturnValueOnce({ language: 'English', experience_level: 'beginner' });
    mockAll.mockReturnValueOnce([]);

    const request = createMockRequest({
      messages: [{ role: 'user', content: 'hello' }],
      userId: 'user-1',
      provider: 'openrouter',
      apiKey: 'test-key'
    });

    const response = await POST(request);
    expect(response).toBeInstanceOf(Response);

    const { streamText } = await import('ai');
    expect(streamText).toHaveBeenCalled();
  });

  it('successfully calls ai provider with default fallback (unknown provider)', async () => {
    mockGet.mockReturnValueOnce({ language: 'English', experience_level: 'beginner' });
    mockAll.mockReturnValueOnce([]);

    const request = createMockRequest({
      messages: [{ role: 'user', content: 'hello' }],
      userId: 'user-1',
      provider: 'unknown',
      apiKey: 'test-key'
    });

    const response = await POST(request);
    expect(response).toBeInstanceOf(Response);

    const { streamText } = await import('ai');
    expect(streamText).toHaveBeenCalled();
  });

  it('handles provider error', async () => {
    mockGet.mockReturnValueOnce({ language: 'English', experience_level: 'beginner' });
    mockAll.mockReturnValueOnce([]);

    const { streamText } = await import('ai');
    (streamText as any).mockRejectedValueOnce(new Error('Invalid API Key'));

    const request = createMockRequest({
      messages: [{ role: 'user', content: 'hello' }],
      userId: 'user-1',
      provider: 'openai',
      apiKey: 'test-key'
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
