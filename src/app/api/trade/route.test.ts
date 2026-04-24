import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';

// Mock dependencies
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data, init) => ({ data, init })),
  },
}));

// Create mocks directly outside the vi.mock to export them properly
const runMock = vi.fn();
const getMock = vi.fn();
const prepareMock = vi.fn(() => ({ run: runMock, get: getMock }));

vi.mock('@/lib/db', () => {
  return {
    default: {
      transaction: vi.fn((cb) => {
        return () => cb();
      }),
      prepare: (...args: any[]) => prepareMock(...args),
    },
  };
});

vi.mock('yahoo-finance2', () => ({
  default: {
    quote: vi.fn(),
  },
}));

// Import mocked modules after setup
import db from '@/lib/db';
import yahooFinance from 'yahoo-finance2';
import { NextResponse } from 'next/server';

// Get mocked instances
const quoteMock = vi.mocked(yahooFinance.quote);

describe('Trade API Route - BUY logic', () => {
  let consoleErrorSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  const createRequest = (body: any) => ({
    json: async () => body,
  } as Request);

  it('should successfully execute a BUY trade and update balance and portfolio', async () => {
    // Setup mock values
    const userId = 'user-1';
    const symbol = 'AAPL';
    const shares = 10;
    const currentPrice = 150;

    quoteMock.mockResolvedValueOnce({ regularMarketPrice: currentPrice } as any);

    // Setup DB mock responses
    getMock.mockImplementation((...args) => {
      const queryStr = prepareMock.mock.calls[prepareMock.mock.calls.length - 1][0] as string;

      if (queryStr.includes('SELECT balance FROM users')) {
        return { balance: 2000 }; // Ensure user has enough balance (10 * 150 = 1500)
      }

      if (queryStr.includes('SELECT shares, average_price FROM portfolio')) {
        return undefined; // No existing holding
      }

      return undefined;
    });

    const request = createRequest({ userId, symbol, type: 'BUY', shares });

    const response = await POST(request) as any;

    expect(response.data).toEqual({
      success: true,
      currentPrice: 150,
      totalValue: 1500
    });

    expect(db.transaction).toHaveBeenCalled();

    // Check balance update
    expect(prepareMock).toHaveBeenCalledWith('UPDATE users SET balance = balance - ? WHERE id = ?');
    expect(runMock).toHaveBeenCalledWith(1500, userId);

    // Check portfolio update
    expect(prepareMock).toHaveBeenCalledWith('INSERT INTO portfolio (user_id, symbol, shares, average_price) VALUES (?, ?, ?, ?)');
    expect(runMock).toHaveBeenCalledWith(userId, symbol, shares, currentPrice);

    // Check transaction record
    expect(prepareMock).toHaveBeenCalledWith('INSERT INTO transactions (user_id, symbol, type, shares, price) VALUES (?, ?, ?, ?, ?)');
    expect(runMock).toHaveBeenCalledWith(userId, symbol, 'BUY', shares, currentPrice);
  });

  it('should update existing portfolio when buying a stock already held', async () => {
    const userId = 'user-1';
    const symbol = 'AAPL';
    const shares = 5;
    const currentPrice = 150; // Total new value = 750

    quoteMock.mockResolvedValueOnce({ regularMarketPrice: currentPrice } as any);

    getMock.mockImplementation((...args) => {
      const queryStr = prepareMock.mock.calls[prepareMock.mock.calls.length - 1][0] as string;
      if (queryStr.includes('SELECT balance FROM users')) return { balance: 2000 };
      if (queryStr.includes('SELECT shares, average_price FROM portfolio')) {
        return { shares: 10, average_price: 100 }; // Existing 10 shares at $100
      }
      return undefined;
    });

    const request = createRequest({ userId, symbol, type: 'BUY', shares });
    await POST(request);

    // Check portfolio update for existing stock
    const expectedNewShares = 15; // 10 + 5
    const expectedNewAvg = ((10 * 100) + 750) / 15;

    expect(prepareMock).toHaveBeenCalledWith('UPDATE portfolio SET shares = ?, average_price = ? WHERE user_id = ? AND symbol = ?');
    expect(runMock).toHaveBeenCalledWith(expectedNewShares, expectedNewAvg, userId, symbol);
  });

  it('should return error if user has insufficient funds', async () => {
    const userId = 'user-1';
    const symbol = 'AAPL';
    const shares = 10;
    const currentPrice = 150; // Total needed = 1500

    quoteMock.mockResolvedValueOnce({ regularMarketPrice: currentPrice } as any);

    getMock.mockImplementation((...args) => {
      const queryStr = prepareMock.mock.calls[prepareMock.mock.calls.length - 1][0] as string;
      if (queryStr.includes('SELECT balance FROM users')) return { balance: 1000 }; // Insufficient
      return undefined;
    });

    const request = createRequest({ userId, symbol, type: 'BUY', shares });
    const response = await POST(request) as any;

    expect(response.data).toEqual({ error: 'Insufficient funds' });
    expect(response.init?.status).toBe(400);

    // Ensure no updates occurred
    expect(runMock).not.toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('should return error for invalid input (e.g., negative shares)', async () => {
    const request = createRequest({ userId: 'user-1', symbol: 'AAPL', type: 'BUY', shares: -5 });
    const response = await POST(request) as any;

    expect(response.data).toEqual({ error: 'Invalid input' });
    expect(response.init?.status).toBe(400);
    expect(quoteMock).not.toHaveBeenCalled();
  });

  it('should return error for invalid input (e.g., non-integer shares)', async () => {
    const request = createRequest({ userId: 'user-1', symbol: 'AAPL', type: 'BUY', shares: 5.5 });
    const response = await POST(request) as any;

    expect(response.data).toEqual({ error: 'Invalid input' });
    expect(response.init?.status).toBe(400);
    expect(quoteMock).not.toHaveBeenCalled();
  });
});
