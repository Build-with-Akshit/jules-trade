import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';
import { NextResponse } from 'next/server';

// Mock dependencies
vi.mock('@/lib/db', () => ({
  default: {
    prepare: vi.fn(),
  },
}));

vi.mock('yahoo-finance2', () => ({
  default: {
    quote: vi.fn(),
  },
}));

import db from '@/lib/db';
import yahooFinance from 'yahoo-finance2';

describe('Portfolio API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 400 if userId is missing', async () => {
    const request = new Request('http://localhost/api/portfolio');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('User ID is required');
  });

  it('should return 404 if user is not found', async () => {
    const mockPrepare = vi.fn().mockImplementation((query) => {
      if (query.includes('FROM users')) {
        return { get: vi.fn().mockReturnValue(undefined) };
      }
      return { get: vi.fn(), all: vi.fn() };
    });
    (db.prepare as any) = mockPrepare;

    const request = new Request('http://localhost/api/portfolio?userId=not-found');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('User not found');
  });

  it('should return portfolio data successfully with mocked market data', async () => {
    const mockPrepare = vi.fn().mockImplementation((query) => {
      if (query.includes('FROM users')) {
        return { get: vi.fn().mockReturnValue({ balance: 1000 }) };
      }
      if (query.includes('FROM portfolio')) {
        return { all: vi.fn().mockReturnValue([
          { symbol: 'AAPL', shares: 10, average_price: 150 }
        ]) };
      }
      if (query.includes('FROM transactions')) {
        return { all: vi.fn().mockReturnValue([
          { symbol: 'AAPL', type: 'BUY', shares: 10, price: 150, timestamp: '2024-01-01T00:00:00Z' }
        ]) };
      }
      return { get: vi.fn(), all: vi.fn() };
    });
    (db.prepare as any) = mockPrepare;

    (yahooFinance.quote as any).mockResolvedValue([
      { symbol: 'AAPL', regularMarketPrice: 160 }
    ]);

    const request = new Request('http://localhost/api/portfolio?userId=user1');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.balance).toBe(1000);
    expect(data.holdings).toHaveLength(1);
    expect(data.holdings[0].symbol).toBe('AAPL');
    expect(data.holdings[0].currentPrice).toBe(160);
    expect(data.holdings[0].totalValue).toBe(1600); // 10 shares * 160
    expect(data.holdings[0].return).toBe(100); // 1600 - 1500
    expect(data.holdings[0].returnPct).toBeCloseTo(6.67, 2); // (160 - 150) / 150 * 100
    expect(data.portfolioValue).toBe(1600);
    expect(data.totalValue).toBe(2600); // 1000 balance + 1600 portfolio
    expect(data.transactions).toHaveLength(1);
  });

  it('should handle yahooFinance fallback if fetch fails', async () => {
    const mockPrepare = vi.fn().mockImplementation((query) => {
      if (query.includes('FROM users')) {
        return { get: vi.fn().mockReturnValue({ balance: 1000 }) };
      }
      if (query.includes('FROM portfolio')) {
        return { all: vi.fn().mockReturnValue([
          { symbol: 'AAPL', shares: 10, average_price: 150 }
        ]) };
      }
      if (query.includes('FROM transactions')) {
        return { all: vi.fn().mockReturnValue([]) };
      }
      return { get: vi.fn(), all: vi.fn() };
    });
    (db.prepare as any) = mockPrepare;

    (yahooFinance.quote as any).mockRejectedValue(new Error('API Rate Limit'));

    const request = new Request('http://localhost/api/portfolio?userId=user1');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.holdings).toHaveLength(1);
    expect(data.holdings[0].currentPrice).toBe(150); // Fallback to average_price
    expect(data.holdings[0].totalValue).toBe(1500);
    expect(data.holdings[0].return).toBe(0);
    expect(data.holdings[0].returnPct).toBe(0);
  });

  it('should return 500 if database fails', async () => {
    const mockPrepare = vi.fn().mockImplementation(() => {
      throw new Error('Database Error');
    });
    (db.prepare as any) = mockPrepare;

    const request = new Request('http://localhost/api/portfolio?userId=user1');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to fetch portfolio');
  });
});
