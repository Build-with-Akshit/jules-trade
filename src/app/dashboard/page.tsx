"use client";

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, TrendingUp, TrendingDown, BookOpen, Briefcase } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [portfolio, setPortfolio] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [tradeShares, setTradeShares] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (!savedUser) {
      router.push('/login');
      return;
    }
    const parsed = JSON.parse(savedUser);
    setUser(parsed);
    fetchPortfolio(parsed.id);
  }, [router]);

  const fetchPortfolio = async (userId: number) => {
    try {
      const res = await fetch(`/api/portfolio?userId=${userId}`);
      const data = await res.json();
      if (!data.error) {
        setPortfolio(data);
      }
    } catch (err) {
      console.error('Failed to fetch portfolio');
    } finally {
      setIsLoading(false);
    }
  };

  // Real-time polling effect
  useEffect(() => {
    if (!user) return;

    const intervalId = setInterval(() => {
      // Refresh portfolio silently
      fetchPortfolio(user.id);

      // Refresh selected asset silently
      if (selectedAsset) {
        fetch(`/api/market/quote?symbol=${selectedAsset.symbol}`)
          .then(res => res.json())
          .then(data => {
            if (!data.error) {
              setSelectedAsset(data);
            }
          })
          .catch(err => console.error("Real-time quote error:", err));
      }
    }, 5000); // Update every 5 seconds for a real-time feel

    return () => clearInterval(intervalId);
  }, [user, selectedAsset]);

  const performSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setErrorMsg('');
      return;
    }
    setErrorMsg('');
    try {
      const res = await fetch(`/api/market/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setSearchResults(data.slice(0, 5));
      } else if (data.error) {
         setSearchResults([]);
         setErrorMsg(data.error);
      } else {
         setSearchResults([]);
      }
    } catch (err) {
      console.error(err);
      setSearchResults([]);
      setErrorMsg('Search failed. Please try again.');
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
     const query = e.target.value;
     setSearchQuery(query);

     // Debounce search
     if (searchTimeout.current) clearTimeout(searchTimeout.current);
     searchTimeout.current = setTimeout(() => {
         performSearch(query);
     }, 500);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    performSearch(searchQuery);
  };

  const selectAsset = async (symbol: string) => {
    try {
      const res = await fetch(`/api/market/quote?symbol=${symbol}`);
      const data = await res.json();
      if (data.error) {
          setErrorMsg(data.error);
      } else {
          setSelectedAsset(data);
          setSearchResults([]);
          setSearchQuery('');
          setErrorMsg('');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to fetch asset quote');
    }
  };

  const executeTrade = async (type: 'BUY' | 'SELL') => {
    if (!user || !selectedAsset) return;
    try {
      const res = await fetch('/api/trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          symbol: selectedAsset.symbol,
          type,
          shares: Number(tradeShares)
        })
      });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
      } else {
        alert(`Successfully ${type === 'BUY' ? 'bought' : 'sold'} ${tradeShares} shares of ${selectedAsset.symbol}!`);
        setSelectedAsset(null);
        fetchPortfolio(user.id);
      }
    } catch (err) {
      alert('Trade failed');
    }
  };

  const logout = () => {
    localStorage.removeItem('user');
    router.push('/login');
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center text-black">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white dark:text-gray-100 transition-colors">
      <nav className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center text-blue-600 font-bold text-xl">
              <Briefcase className="mr-2" />
              PaperTrade Learn
            </div>
            <div className="flex items-center space-x-4">
              <ThemeToggle />
              <span className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400">Code: <span className="font-mono font-bold text-black dark:text-white">{user?.login_code}</span></span>
              <button onClick={() => router.push('/course')} className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 flex items-center">
                <BookOpen className="w-4 h-4 mr-1" />
                AI Course
              </button>
              <button onClick={logout} className="text-sm font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">Logout</button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Top Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:border dark:border-gray-700 p-6 border-l-4 border-blue-500 relative">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Account Value</h3>
            <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white transition-colors">${portfolio?.totalValue?.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) || '0.00'}</p>
            <span className="absolute top-4 right-4 flex h-3 w-3" title="Real-time syncing">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
            </span>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:border dark:border-gray-700 p-6 border-l-4 border-green-500 relative">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Available Cash</h3>
            <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">${portfolio?.balance?.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) || '0.00'}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:border dark:border-gray-700 p-6 border-l-4 border-purple-500 relative">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Invested Value (Live)</h3>
            <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white transition-colors">${portfolio?.portfolioValue?.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) || '0.00'}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-8">

            {/* Trade & Search */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:border dark:border-gray-700 p-6">
              <h2 className="text-xl font-bold mb-4">Trade Assets</h2>
              <form onSubmit={handleSearchSubmit} className="relative flex items-center">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  placeholder="Search symbol or company (e.g., AAPL, BTC-USD)"
                  className="w-full pl-10 pr-4 py-2 border rounded-md text-black focus:ring-blue-500 focus:border-blue-500"
                  autoComplete="off"
                />
                <Search className="absolute left-3 w-5 h-5 text-gray-400" />
                <button type="submit" className="ml-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition">Search</button>
              </form>

              {errorMsg && <p className="text-sm text-red-600 mt-2">{errorMsg}</p>}

              {searchResults.length > 0 && (
                <ul className="mt-2 border rounded-md divide-y dark:divide-gray-700 max-h-60 overflow-y-auto bg-white absolute w-[calc(100%-4rem)] z-10 shadow-lg">
                  {searchResults.map((result: any, i) => (
                    <li key={i} onClick={() => selectAsset(result.symbol)} className="p-3 hover:bg-gray-50 cursor-pointer flex justify-between items-center transition">
                      <div>
                        <span className="font-bold text-blue-600">{result.symbol}</span>
                        <span className="ml-2 text-sm text-gray-600">{result.shortname || result.longname}</span>
                      </div>
                      <span className="text-xs bg-gray-100 text-gray-500 dark:text-gray-400 px-2 py-1 rounded border">{result.quoteType}</span>
                    </li>
                  ))}
                </ul>
              )}

              {selectedAsset && (
                <div className="mt-6 p-4 border rounded-lg bg-gray-50 relative">
                  <button
                      onClick={() => setSelectedAsset(null)}
                      className="absolute top-2 right-2 text-gray-400 hover:text-gray-700"
                  >
                      ✕
                  </button>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-2xl font-bold">{selectedAsset.symbol}</h3>
                      <p className="text-gray-600">{selectedAsset.shortName || selectedAsset.longName}</p>
                      <span className="text-xs text-blue-600 font-medium px-2 py-1 bg-blue-50 rounded-full inline-block mt-2 border border-blue-100">🔴 Live Pricing</span>
                    </div>
                    <div className="text-right mt-1 mr-4">
                      <p className="text-3xl font-bold">${selectedAsset.regularMarketPrice?.toFixed(2)}</p>
                      <p className={`text-sm font-medium ${selectedAsset.regularMarketChange >= 0 ? 'text-green-600' : 'text-red-600'} flex items-center justify-end transition-colors`}>
                        {selectedAsset.regularMarketChange >= 0 ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
                        {selectedAsset.regularMarketChange?.toFixed(2)} ({selectedAsset.regularMarketChangePercent?.toFixed(2)}%)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Shares to Trade</label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={tradeShares}
                        onChange={(e) => setTradeShares(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 text-black"
                      />
                    </div>
                    <div className="flex-1 pt-6 flex space-x-2">
                      <button onClick={() => executeTrade('BUY')} className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 font-bold transition shadow-sm">
                        BUY
                      </button>
                      <button onClick={() => executeTrade('SELL')} className="flex-1 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 font-bold transition shadow-sm">
                        SELL
                      </button>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-center">Estimated total: ${(selectedAsset.regularMarketPrice * tradeShares).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                </div>
              )}
            </div>

            {/* Holdings */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:border dark:border-gray-700 overflow-hidden">
              <div className="px-6 py-4 border-b dark:border-gray-700 flex justify-between items-center">
                <h2 className="text-xl font-bold">Your Portfolio</h2>
                <span className="text-xs text-gray-400">Updates every 5s</span>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y dark:divide-gray-700 divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Asset</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Shares</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Avg Price</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Current Price</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Value</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Return</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y dark:divide-gray-700 divide-gray-200 dark:divide-gray-700">
                    {portfolio?.holdings?.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">No assets in portfolio yet. Start trading above!</td>
                      </tr>
                    ) : (
                      portfolio?.holdings?.map((h: any, i: number) => (
                        <tr key={i} className="hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => selectAsset(h.symbol)}>
                          <td className="px-6 py-4 whitespace-nowrap font-bold text-blue-600">{h.symbol}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm">{h.shares}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm">${h.average_price.toFixed(2)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm transition-colors">${h.currentPrice.toFixed(2)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium transition-colors">${h.totalValue.toFixed(2)}</td>
                          <td className={`px-6 py-4 whitespace-nowrap text-right text-sm font-medium transition-colors ${h.return >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ${h.return.toFixed(2)} ({h.returnPct.toFixed(2)}%)
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          {/* Right Sidebar */}
          <div className="space-y-8">

            {/* AI Learning Teaser */}
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg shadow p-6 text-white text-center">
              <BookOpen className="w-12 h-12 mx-auto mb-4 text-blue-200" />
              <h2 className="text-xl font-bold mb-2">Personalized Course & AI</h2>
              <p className="text-blue-100 text-sm mb-4">Learn basics and use any AI model (ChatGPT, Claude, etc) as your mentor.</p>
              <button onClick={() => router.push('/course')} className="w-full bg-white text-blue-600 font-bold py-2 px-4 rounded hover:bg-blue-50 transition shadow">
                Open Learning Center
              </button>
            </div>

            {/* Recent Transactions */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:border dark:border-gray-700">
              <div className="px-6 py-4 border-b dark:border-gray-700">
                <h2 className="text-lg font-bold">Recent History</h2>
              </div>
              <ul className="divide-y dark:divide-gray-700 divide-gray-200 dark:divide-gray-700">
                {portfolio?.transactions?.length === 0 ? (
                  <li className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">No transactions yet.</li>
                ) : (
                  portfolio?.transactions?.map((t: any, i: number) => (
                    <li key={i} className="px-6 py-3 flex justify-between items-center hover:bg-gray-50">
                      <div>
                        <p className="text-sm font-bold">
                          <span className={t.type === 'BUY' ? 'text-green-600' : 'text-red-600'}>{t.type}</span> {t.symbol}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(t.timestamp).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{t.shares} sh</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">@ ${t.price.toFixed(2)}</p>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </div>

          </div>

        </div>
      </main>
    </div>
  );
}
