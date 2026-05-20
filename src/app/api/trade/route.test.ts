import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST, PUT } from './route';

// Mock dependencies
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data, init) => ({ data, init })),
  },
}));

const executeMock = vi.fn();
const dbExecuteMock = vi.fn();
const commitMock = vi.fn();
const rollbackMock = vi.fn();
const transactionMock = vi.fn().mockResolvedValue({
  execute: executeMock,
  commit: commitMock,
  rollback: rollbackMock
});

vi.mock('@/lib/db', () => ({
  default: {
    transaction: (...args: any[]) => transactionMock(...args),
    execute: (...args: any[]) => dbExecuteMock(...args)
  }
}));

vi.mock('yahoo-finance2', () => {
  const quoteMock = vi.fn();
  return {
    default: class MockYahooFinance {
      static mockQuote = quoteMock;
      quote = quoteMock;
    }
  };
});

// Import mocked modules after setup
import db from '@/lib/db';
import YahooFinance from 'yahoo-finance2';

const mockQuote = (YahooFinance as any).mockQuote;

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

    mockQuote.mockResolvedValueOnce({ regularMarketPrice: currentPrice } as any);

    // Setup DB mock responses inside the transaction execute Mock
    executeMock.mockImplementation(async ({ sql, args }) => {
      if (sql.includes('SELECT balance FROM users')) {
        return { rows: [{ balance: 2000 }] }; // Enough balance (10 * 150 = 1500)
      }
      if (sql.includes('SELECT shares, average_price FROM portfolio')) {
        return { rows: [] }; // No existing holding
      }
      return { rows: [] };
    });

    const request = createRequest({ userId, symbol, type: 'BUY', shares });

    const response = await POST(request) as any;

    expect(response.data).toEqual({
      success: true,
      currentPrice: 150,
      totalValue: 1500
    });

    expect(transactionMock).toHaveBeenCalledWith("write");
    expect(commitMock).toHaveBeenCalled();

    // Verify SQL executions
    const calls = executeMock.mock.calls;
    
    // Check balance update call
    const updateBalanceCall = calls.find(c => c[0].sql.includes('UPDATE users SET balance = balance - ?'));
    expect(updateBalanceCall).toBeDefined();
    expect(updateBalanceCall[0].args).toEqual([1500, userId]);

    // Check portfolio insert call
    const insertPortfolioCall = calls.find(c => c[0].sql.includes('INSERT INTO portfolio'));
    expect(insertPortfolioCall).toBeDefined();
    expect(insertPortfolioCall[0].args).toEqual([userId, symbol, shares, currentPrice]);

    // Check transaction record call
    const insertTransactionCall = calls.find(c => c[0].sql.includes('INSERT INTO transactions'));
    expect(insertTransactionCall).toBeDefined();
    expect(insertTransactionCall[0].args).toEqual([userId, symbol, 'BUY', shares, currentPrice]);
  });

  it('should update existing portfolio when buying a stock already held', async () => {
    const userId = 'user-1';
    const symbol = 'AAPL';
    const shares = 5;
    const currentPrice = 150; // Total new value = 750

    mockQuote.mockResolvedValueOnce({ regularMarketPrice: currentPrice } as any);

    executeMock.mockImplementation(async ({ sql }) => {
      if (sql.includes('SELECT balance FROM users')) return { rows: [{ balance: 2000 }] };
      if (sql.includes('SELECT shares, average_price FROM portfolio')) {
        return { rows: [{ shares: 10, average_price: 100 }] }; // Existing 10 shares at $100
      }
      return { rows: [] };
    });

    const request = createRequest({ userId, symbol, type: 'BUY', shares });
    await POST(request);

    // Check portfolio update for existing stock
    const expectedNewShares = 15; // 10 + 5
    const expectedNewAvg = ((10 * 100) + 750) / 15;

    const calls = executeMock.mock.calls;
    const updatePortfolioCall = calls.find(c => c[0].sql.includes('UPDATE portfolio SET shares = ?, average_price = ?'));
    expect(updatePortfolioCall).toBeDefined();
    expect(updatePortfolioCall[0].args).toEqual([expectedNewShares, expectedNewAvg, userId, symbol]);
  });

  it('should return error if user has insufficient funds', async () => {
    const userId = 'user-1';
    const symbol = 'AAPL';
    const shares = 10;
    const currentPrice = 150; // Total needed = 1500

    mockQuote.mockResolvedValueOnce({ regularMarketPrice: currentPrice } as any);

    executeMock.mockImplementation(async ({ sql }) => {
      if (sql.includes('SELECT balance FROM users')) return { rows: [{ balance: 1000 }] }; // Insufficient
      return { rows: [] };
    });

    const request = createRequest({ userId, symbol, type: 'BUY', shares });
    const response = await POST(request) as any;

    expect(response.data).toEqual({ error: 'Insufficient funds' });
    expect(response.init?.status).toBe(400);

    expect(rollbackMock).toHaveBeenCalled();
    expect(commitMock).not.toHaveBeenCalled();
  });

  it('should return error for invalid input (e.g., negative shares)', async () => {
    const request = createRequest({ userId: 'user-1', symbol: 'AAPL', type: 'BUY', shares: -5 });
    const response = await POST(request) as any;

    expect(response.data).toEqual({ error: 'Invalid input' });
    expect(response.init?.status).toBe(400);
    expect(mockQuote).not.toHaveBeenCalled();
  });

  it('should return error for invalid input (e.g., non-integer shares)', async () => {
    const request = createRequest({ userId: 'user-1', symbol: 'AAPL', type: 'BUY', shares: 5.5 });
    const response = await POST(request) as any;

    expect(response.data).toEqual({ error: 'Invalid input' });
    expect(response.init?.status).toBe(400);
    expect(mockQuote).not.toHaveBeenCalled();
  });
});

describe('Trade API Route - PUT logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createRequest = (body: any) => ({
    json: async () => body,
  } as Request);

  it('should modify a pending order successfully', async () => {
    dbExecuteMock
      .mockResolvedValueOnce({ rows: [{ status: 'PENDING' }] }) // checkOrder query
      .mockResolvedValueOnce({ rows: [] }) // update query
      .mockResolvedValueOnce({ rows: [] }); // processPendingOrders query

    const request = createRequest({
      orderId: 123,
      userId: 1,
      shares: 50,
      price: 150.5
    });

    const response = await PUT(request) as any;
    expect(response.data).toEqual({ success: true });
    
    const updateCall = dbExecuteMock.mock.calls.find(c => c[0].sql.includes('UPDATE pending_orders'));
    expect(updateCall).toBeDefined();
    expect(updateCall[0].args).toEqual([50, 150.5, 123, 1]);
  });

  it('should return 400 if validation fails', async () => {
    const request = createRequest({
      orderId: 123,
      userId: 1,
      shares: -10,
      price: 150.5
    });

    const response = await PUT(request) as any;
    expect(response.data).toEqual({ error: 'Shares and price must be greater than zero' });
    expect(response.init?.status).toBe(400);
  });
});
