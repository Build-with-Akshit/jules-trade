"use client";

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, TrendingUp, TrendingDown, BookOpen, Briefcase, FileText, Coins, Percent } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';

function formatMarketState(state: string) {
  if (!state) return 'CLOSED';
  const cleanState = state.toUpperCase();
  if (cleanState === 'REGULAR') return 'OPEN';
  if (cleanState.startsWith('PRE')) return 'PRE-MARKET';
  if (cleanState.startsWith('POST')) return 'CLOSED';
  return cleanState;
}

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [portfolio, setPortfolio] = useState<any>(null);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  
  // Active selected asset
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [activeAssetTab, setActiveAssetTab] = useState<'trade' | 'options'>('trade');
  
  // Trade setup state
  const [tradeShares, setTradeShares] = useState<string>('1');
  const [tradeOrderType, setTradeOrderType] = useState<'MARKET' | 'LIMIT' | 'STOP_LOSS'>('MARKET');
  const [tradePrice, setTradePrice] = useState<string>('');
  
  // Option Chain state
  const [selectedExpiry, setSelectedExpiry] = useState<string>('');
  const [optionChain, setOptionChain] = useState<any>(null);
  const [showGreeks, setShowGreeks] = useState<boolean>(true);
  const [isLoadingOptions, setIsLoadingOptions] = useState<boolean>(false);
  
  // Dashboard Tabs
  const [dashboardTab, setDashboardTab] = useState<'holdings' | 'pending'>('holdings');

  // Modifying Order State
  const [modifyingOrder, setModifyingOrder] = useState<any | null>(null);
  const [modifyShares, setModifyShares] = useState<number>(0);
  const [modifyPrice, setModifyPrice] = useState<string>('');

  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [isExecutingTrade, setIsExecutingTrade] = useState(false);
  const [isModifyingOrder, setIsModifyingOrder] = useState(false);
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

    // Check if we came from the Explore page
    const preselect = localStorage.getItem('preselect_asset');
    if (preselect) {
      selectAsset(preselect);
      localStorage.removeItem('preselect_asset');
    }
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

  const selectedAssetRef = useRef(selectedAsset);
  useEffect(() => {
    selectedAssetRef.current = selectedAsset;
  }, [selectedAsset]);

  const userRef = useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Real-time polling effect
  useEffect(() => {
    if (!user) return;
    let isCurrent = true;

    const intervalId = setInterval(() => {
      const currentUser = userRef.current;
      const currentAsset = selectedAssetRef.current;
      if (!currentUser) return;

      // Refresh portfolio silently
      fetchPortfolio(currentUser.id);

      // Refresh selected asset silently
      if (currentAsset) {
        fetch(`/api/market/quote?symbol=${currentAsset.symbol}`)
          .then(res => res.json())
          .then(data => {
            if (isCurrent && !data.error) {
              setSelectedAsset(data);
            }
          })
          .catch(err => console.error("Real-time quote error:", err));
      }
    }, 3000); // Update every 3 seconds for stability and real-time feel

    return () => {
      isCurrent = false;
      clearInterval(intervalId);
    };
  }, [user?.id]);

  // Fetch Option Chain when selected asset tab or selected expiry changes
  const fetchOptionChain = async (symbol: string, expiry: string = '') => {
    setIsLoadingOptions(true);
    try {
      const res = await fetch(`/api/market/options?symbol=${symbol}&expiry=${expiry}`);
      const data = await res.json();
      if (!data.error) {
        setOptionChain(data);
        if (!expiry && data.expirationDates?.length > 0) {
          setSelectedExpiry(data.expirationDates[0]);
        }
      }
    } catch (err) {
      console.error("Failed to fetch option chain", err);
    } finally {
      setIsLoadingOptions(false);
    }
  };

  useEffect(() => {
    if (selectedAsset?.symbol && activeAssetTab === 'options') {
      fetchOptionChain(selectedAsset.symbol, selectedExpiry);
    }
  }, [selectedAsset?.symbol, selectedExpiry, activeAssetTab]);

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
      if (query.trim().length > 1) {
        performSearch(query);
      } else {
        setSearchResults([]);
      }
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
          setActiveAssetTab('trade');
          setOptionChain(null);
          setSelectedExpiry('');
          setTradeShares('1');
          setTradeOrderType('MARKET');
          setTradePrice('');
          setSearchResults([]);
          setSearchQuery('');
          setErrorMsg('');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to fetch asset quote');
    }
  };

  const convertAmountFrontend = (amount: number, fromCurrency: string, toCurrency: string) => {
    if (!amount || fromCurrency === toCurrency) return amount;
    const rate = portfolio?.exchangeRate || 83.5;
    if (fromCurrency === 'USD' && toCurrency === 'INR') {
      return amount * rate;
    }
    if (fromCurrency === 'INR' && toCurrency === 'USD') {
      return amount / rate;
    }
    return amount;
  };

  const executeTrade = async (type: 'BUY' | 'SELL') => {
    if (!user || !selectedAsset || isExecutingTrade) return;
    setIsExecutingTrade(true);

    const isPendingOrder = tradeOrderType !== 'MARKET';
    const targetPrice = isPendingOrder ? parseFloat(tradePrice) : undefined;

    if (isPendingOrder && (!targetPrice || targetPrice <= 0)) {
      alert('Please enter a valid price for Limit or Stop Loss orders.');
      setIsExecutingTrade(false);
      return;
    }

    // Convert from userCurrency to selectedAsset.currency (native)
    let targetPriceNative = targetPrice;
    if (isPendingOrder && targetPrice) {
      const assetCurrency = selectedAsset.currency || 'USD';
      targetPriceNative = convertAmountFrontend(targetPrice, userCurrency, assetCurrency);
    }

    try {
      const res = await fetch('/api/trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          symbol: selectedAsset.symbol,
          type,
          shares: Number(tradeShares),
          orderType: tradeOrderType,
          price: targetPriceNative
        })
      });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
      } else {
        if (data.pending) {
          alert(`Successfully placed ${tradeOrderType} ${type} order for ${tradeShares} shares of ${selectedAsset.symbol}!`);
        } else {
          alert(`Successfully ${type === 'BUY' ? 'bought' : 'sold'} ${tradeShares} shares of ${selectedAsset.symbol}!`);
        }
        setSelectedAsset(null);
        fetchPortfolio(user.id);
      }
    } catch (err) {
      alert('Trade failed');
    } finally {
      setIsExecutingTrade(false);
    }
  };

  const cancelPendingOrder = async (orderId: number) => {
    if (!user) return;
    const confirmCancel = window.confirm("Are you sure you want to cancel this pending order?");
    if (!confirmCancel) return;

    try {
      const res = await fetch('/api/trade', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          userId: user.id
        })
      });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
      } else {
        alert('Order cancelled successfully.');
        fetchPortfolio(user.id);
      }
    } catch (err) {
      alert('Failed to cancel order');
    }
  };

  const handleModifyClick = (order: any) => {
    setModifyingOrder(order);
    setModifyShares(order.shares);
    setModifyPrice(order.price.toString());
  };

  const submitModifyOrder = async () => {
    if (!user || !modifyingOrder || isModifyingOrder) return;
    setIsModifyingOrder(true);

    if (modifyShares <= 0 || !modifyPrice || parseFloat(modifyPrice) <= 0) {
      alert('Please enter valid shares and target price.');
      setIsModifyingOrder(false);
      return;
    }

    try {
      const res = await fetch('/api/trade', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: modifyingOrder.id,
          userId: user.id,
          shares: Number(modifyShares),
          price: convertAmountFrontend(parseFloat(modifyPrice), userCurrency, modifyingOrder.assetCurrency)
        })
      });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
      } else {
        alert('Order modified successfully.');
        setModifyingOrder(null);
        fetchPortfolio(user.id);
      }
    } catch (err) {
      alert('Failed to modify order');
    } finally {
      setIsModifyingOrder(false);
    }
  };

  const toggleCurrency = async (newCurrency: 'USD' | 'INR') => {
    if (!user) return;
    try {
      const res = await fetch('/api/settings/currency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, currency: newCurrency })
      });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
      } else {
        const updatedUser = { ...user, currency: newCurrency, balance: data.balance };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        fetchPortfolio(user.id);
      }
    } catch (err) {
      alert('Failed to toggle currency');
    }
  };

  const loadOptionForTrade = async (optionSymbol: string) => {
    try {
      const res = await fetch(`/api/market/quote?symbol=${optionSymbol}`);
      const data = await res.json();
      if (data.error) {
        alert(data.error);
      } else {
        setSelectedAsset(data);
        setActiveAssetTab('trade');
        setTradeShares('1');
        setTradeOrderType('MARKET');
        setTradePrice('');
      }
    } catch (err) {
      alert('Failed to load option contract details');
    }
  };

  const logout = () => {
    localStorage.removeItem('user');
    router.push('/login');
  };

  const deleteAccount = async () => {
    if (!user) return;
    const confirmDelete = window.confirm(
      "⚠️ WARNING: Are you sure you want to PERMANENTLY delete your account? This will erase all your portfolio holdings, cash balance, course progress, and transaction history from the server. This action CANNOT be undone."
    );
    if (!confirmDelete) return;

    try {
      const res = await fetch('/api/auth/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
      } else {
        alert("Your account and all associated data have been permanently deleted.");
        localStorage.removeItem('user');
        router.push('/login');
      }
    } catch (err) {
      alert("Failed to delete account. Please try again.");
    }
  };

  const formatCurrency = (val: number, currencyCode: string = 'USD') => {
    const symbol = currencyCode === 'INR' ? '₹' : '$';
    return `${symbol}${Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center text-black">Loading...</div>;

  const userCurrency = portfolio?.currency || 'USD';
  const exchangeRate = portfolio?.exchangeRate || 83.5;
  const startBalance = userCurrency === 'INR' ? (100000.00 * exchangeRate) : 100000.00;
  const netAccountReturn = (portfolio?.totalValue || startBalance) - startBalance;
  const netAccountReturnPct = (netAccountReturn / startBalance) * 100;
  const isAccountProfitable = netAccountReturn >= 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors">
      {/* Navigation */}
      <nav className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center text-blue-600 dark:text-blue-400 font-bold text-xl cursor-pointer" onClick={() => router.push('/dashboard')}>
              <Briefcase className="mr-2" />
              PaperTrade Learn
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Currency Selector */}
              <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5 border dark:border-gray-600">
                <button
                  onClick={() => toggleCurrency('USD')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition ${user?.currency === 'USD' ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm border dark:border-gray-700' : 'text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white'}`}
                >
                  USD ($)
                </button>
                <button
                  onClick={() => toggleCurrency('INR')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition ${user?.currency === 'INR' ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm border dark:border-gray-700' : 'text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white'}`}
                >
                  INR (₹)
                </button>
              </div>

              <ThemeToggle />
              <span className="text-sm text-gray-500 dark:text-gray-400 hidden sm:inline">Code: <span className="font-mono font-bold text-black dark:text-white">{user?.login_code}</span></span>
              <button onClick={() => router.push('/notes')} className="text-sm font-bold text-pink-600 dark:text-pink-400 hover:text-pink-500 flex items-center px-3 py-1.5 bg-pink-50 dark:bg-pink-900/30 rounded-full border border-pink-100 dark:border-pink-800 transition">
                <FileText className="w-4 h-4 mr-1" />
                GOAT Notes
              </button>
              <button onClick={() => router.push('/course')} className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:text-blue-500 flex items-center px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 rounded-full border border-blue-100 dark:border-blue-800 transition">
                <BookOpen className="w-4 h-4 mr-1" />
                AI Course & Mentor
              </button>
              <button onClick={logout} className="text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">Logout</button>
              <button onClick={deleteAccount} className="text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300">Delete Account</button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Top Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 border-l-4 border-blue-500 relative">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Account Value</h3>
            <p className="mt-2 text-3xl font-extrabold text-gray-900 dark:text-white">
              {formatCurrency(portfolio?.totalValue || startBalance, userCurrency)}
            </p>
            <span className="absolute top-4 right-4 flex h-3 w-3" title="Real-time syncing">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
            </span>
          </div>

          <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 border-l-4 ${isAccountProfitable ? 'border-green-500' : 'border-red-500'} relative`}>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Account P&L</h3>
            <p className={`mt-2 text-3xl font-extrabold ${isAccountProfitable ? 'text-green-600' : 'text-red-600'}`}>
              {isAccountProfitable ? '+' : '-'}{formatCurrency(Math.abs(netAccountReturn), userCurrency)}
            </p>
            <p className={`text-sm mt-1 font-semibold ${isAccountProfitable ? 'text-green-600' : 'text-red-600'}`}>
              {isAccountProfitable ? '+' : '-'}{Math.abs(netAccountReturnPct).toFixed(2)}% All time
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 border-l-4 border-green-500">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Available Cash</h3>
            <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(portfolio?.balance || startBalance, userCurrency)}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 border-l-4 border-purple-500">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Invested Value (Live)</h3>
            <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(portfolio?.portfolioValue || 0, userCurrency)}
            </p>
          </div>
        </div>

        {/* Dashboard Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Asset Selection, Options, Portfolio Holdings */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Search & Selection */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 relative">
              <h2 className="text-xl font-bold mb-4">Trade Assets</h2>
              <form onSubmit={handleSearchSubmit} className="relative flex items-center">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  placeholder="Search symbol or company (e.g., RELIANCE.NS, ^NSEI, AAPL, BTC-USD)"
                  className="w-full pl-10 pr-4 py-2 border rounded-md text-black dark:text-white bg-white dark:bg-gray-700 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500"
                  autoComplete="off"
                />
                <Search className="absolute left-3 w-5 h-5 text-gray-400" />
                <button type="submit" className="ml-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-gray-800 dark:hover:bg-gray-700 text-white dark:text-gray-200 border border-transparent dark:border-gray-700 rounded-md transition font-semibold shadow-sm">Search</button>
              </form>

              {errorMsg && <p className="text-sm text-red-600 mt-2">{errorMsg}</p>}

              {searchResults.length > 0 && (
                <ul className="mt-2 border rounded-md divide-y dark:divide-gray-700 max-h-60 overflow-y-auto bg-white dark:bg-gray-800 absolute left-6 right-6 z-10 shadow-lg border-gray-200 dark:border-gray-700">
                  {searchResults.map((result: any, i) => (
                    <li key={i} onClick={() => selectAsset(result.symbol)} className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer flex justify-between items-center transition">
                      <div>
                        <span className="font-bold text-blue-600 dark:text-blue-400">{result.symbol}</span>
                        <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">{result.shortname || result.longname}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        {result.marketState && (
                          <span className={`text-[10px] font-bold px-2 py-1 rounded border ${result.marketState === 'REGULAR' ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:border-green-800 dark:text-green-400' : 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:border-orange-800 dark:text-orange-400'}`}>
                            {result.marketState === 'REGULAR' ? '🟢 OPEN' : `🟠 ${formatMarketState(result.marketState)}`}
                          </span>
                        )}
                        <span className="text-xs bg-gray-100 text-gray-500 dark:text-gray-400 px-2 py-1 rounded border dark:border-gray-600 dark:bg-gray-700">{result.quoteType}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {selectedAsset && (
                <div className="mt-6 p-5 border rounded-xl bg-gray-50 dark:bg-gray-900/30 dark:border-gray-700 relative">
                  <button
                      onClick={() => setSelectedAsset(null)}
                      className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 dark:hover:text-white"
                  >
                      ✕
                  </button>

                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-2xl font-extrabold">{selectedAsset.symbol}</h3>
                      <p className="text-gray-500 dark:text-gray-400">{selectedAsset.shortName || selectedAsset.longName}</p>
                      
                      <div className="flex space-x-2 mt-2">
                        {selectedAsset.marketState === 'REGULAR' ? (
                          <span className="text-xs text-green-700 font-medium px-2 py-0.5 bg-green-100 dark:bg-green-950 dark:text-green-400 rounded-full border border-green-200 dark:border-green-900">🟢 Market Open</span>
                        ) : (
                          <span className="text-xs text-orange-700 font-medium px-2 py-0.5 bg-orange-100 dark:bg-orange-950 dark:text-orange-400 rounded-full border border-orange-200 dark:border-orange-900">🟠 Market {formatMarketState(selectedAsset.marketState)}</span>
                        )}
                        <span className="text-xs text-blue-700 font-medium px-2 py-0.5 bg-blue-100 dark:bg-blue-950 dark:text-blue-400 rounded-full border border-blue-200 dark:border-blue-900">Currency: {selectedAsset.currency || 'USD'}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-extrabold">{formatCurrency(convertAmountFrontend(selectedAsset.regularMarketPrice, selectedAsset.currency, userCurrency), userCurrency)}</p>
                      <p className={`text-sm font-semibold mt-1 flex items-center justify-end ${selectedAsset.regularMarketChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {selectedAsset.regularMarketChange >= 0 ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
                        {formatCurrency(convertAmountFrontend(Math.abs(selectedAsset.regularMarketChange), selectedAsset.currency, userCurrency), userCurrency)} ({selectedAsset.regularMarketChangePercent?.toFixed(2)}%)
                      </p>
                    </div>
                  </div>

                  {/* Asset Details Tabs (Info/Trade vs Option Chain) */}
                  <div className="flex border-b dark:border-gray-700 mb-5">
                    <button
                      onClick={() => setActiveAssetTab('trade')}
                      className={`px-4 py-2 text-sm font-bold border-b-2 transition ${activeAssetTab === 'trade' ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400' : 'border-transparent text-gray-500 hover:text-black dark:hover:text-white'}`}
                    >
                      Trade Asset
                    </button>
                    {(selectedAsset.quoteType === 'EQUITY' || selectedAsset.quoteType === 'INDEX') && (
                      <button
                        onClick={() => {
                          setActiveAssetTab('options');
                        }}
                        className={`px-4 py-2 text-sm font-bold border-b-2 transition ${activeAssetTab === 'options' ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400' : 'border-transparent text-gray-500 hover:text-black dark:hover:text-white'}`}
                      >
                        Option Chain
                      </button>
                    )}
                  </div>

                  {/* Tab 1: Trade Form */}
                  {activeAssetTab === 'trade' && (
                    <div>
                      {/* Portfolio Position Context */}
                      {(() => {
                        const holding = portfolio?.holdings?.find((h: any) => h.symbol === selectedAsset.symbol);
                        if (holding) {
                          const isProfitable = holding.return >= 0;
                          return (
                            <div className={`mb-6 p-4 rounded-xl border ${isProfitable ? 'bg-green-50/50 border-green-200 dark:bg-green-950/20 dark:border-green-900' : 'bg-red-50/50 border-red-200 dark:bg-red-950/20 dark:border-red-900'}`}>
                              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                You currently own <span className="font-extrabold">{holding.shares} shares/contracts</span> at an average price of <span className="font-bold">{formatCurrency(holding.average_price, userCurrency)}</span>.
                              </p>
                              <p className={`text-lg font-bold mt-1 ${isProfitable ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                                Unrealized Profit: {isProfitable ? '+' : '-'}{formatCurrency(Math.abs(holding.return), userCurrency)} ({isProfitable ? '+' : '-'}{holding.returnPct.toFixed(2)}%)
                              </p>
                            </div>
                          );
                        }
                        return null;
                      })()}

                      {/* Trade Panel inputs */}
                      <div className="space-y-4">
                        {/* Order Type Selector */}
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Order Type</label>
                          <div className="grid grid-cols-3 gap-2">
                            {(['MARKET', 'LIMIT', 'STOP_LOSS'] as const).map((oType) => {
                              const activeColors: Record<string, string> = {
                                MARKET: 'bg-emerald-600 text-white border-emerald-600 dark:bg-emerald-500 dark:border-emerald-500 shadow-md',
                                LIMIT: 'bg-indigo-600 text-white border-indigo-600 dark:bg-indigo-500 dark:border-indigo-500 shadow-md',
                                STOP_LOSS: 'bg-amber-500 text-white border-amber-500 dark:bg-amber-500 dark:border-amber-500 shadow-md',
                              };
                              const inactiveColor = 'bg-white text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700';
                              return (
                                <button
                                  key={oType}
                                  type="button"
                                  onClick={() => {
                                    setTradeOrderType(oType);
                                    if (oType !== 'MARKET' && !tradePrice) {
                                      setTradePrice(convertAmountFrontend(selectedAsset.regularMarketPrice, selectedAsset.currency, userCurrency).toFixed(2));
                                    }
                                  }}
                                  className={`py-2 text-xs font-bold rounded-lg border transition cursor-pointer ${tradeOrderType === oType ? activeColors[oType] : inactiveColor}`}
                                >
                                  {oType === 'STOP_LOSS' ? 'STOP LOSS (SL)' : oType}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Shares/Contracts</label>
                            <input
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              value={tradeShares}
                              onChange={(e) => {
                                const val = e.target.value.replace(/[^0-9]/g, '');
                                setTradeShares(val);
                              }}
                              onBlur={() => {
                                const num = parseInt(tradeShares);
                                if (!num || num < 1) setTradeShares('1');
                              }}
                              className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 text-black dark:text-white bg-white dark:bg-gray-700 dark:border-gray-600"
                            />
                          </div>

                          {tradeOrderType !== 'MARKET' && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                {tradeOrderType === 'LIMIT' ? 'Limit Price' : 'Trigger Price'} ({userCurrency})
                              </label>
                              <input
                                type="number"
                                step="0.05"
                                value={tradePrice}
                                onChange={(e) => setTradePrice(e.target.value)}
                                className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 text-black dark:text-white bg-white dark:bg-gray-700 dark:border-gray-600"
                                placeholder={convertAmountFrontend(selectedAsset.regularMarketPrice, selectedAsset.currency, userCurrency).toFixed(2)}
                              />
                            </div>
                          )}
                        </div>

                        <div className="pt-4 flex space-x-4 border-t dark:border-gray-700">
                          <button
                            onClick={() => executeTrade('BUY')}
                            disabled={isExecutingTrade}
                            className="flex-1 bg-green-600 text-white px-4 py-2.5 rounded-lg hover:bg-green-700 font-bold transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                          >
                            {isExecutingTrade ? 'Processing...' : (tradeOrderType === 'MARKET' ? 'BUY MARKET' : `PLACE ${tradeOrderType} BUY`)}
                          </button>
                          <button
                            onClick={() => executeTrade('SELL')}
                            disabled={isExecutingTrade}
                            className="flex-1 bg-red-600 text-white px-4 py-2.5 rounded-lg hover:bg-red-700 font-bold transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                          >
                            {isExecutingTrade ? 'Processing...' : (tradeOrderType === 'MARKET' ? 'SELL MARKET' : `PLACE ${tradeOrderType} SELL`)}
                          </button>
                        </div>

                        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                          {tradeOrderType === 'MARKET' ? (
                            `Estimated Total: ${formatCurrency(convertAmountFrontend(selectedAsset.regularMarketPrice * (Number(tradeShares) || 1), selectedAsset.currency, userCurrency), userCurrency)}`
                          ) : (
                            `Trigger Price: ${formatCurrency(Number(tradePrice) || 0, userCurrency)} | Quantity: ${tradeShares}`
                          )}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Tab 2: Option Chain */}
                  {activeAssetTab === 'options' && (
                    <div className="space-y-4">
                      {/* Expiry / Greeks controls */}
                      <div className="flex justify-between items-center bg-white dark:bg-gray-800 p-3 rounded-lg border dark:border-gray-700">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Expiry Date:</span>
                          <select
                            value={selectedExpiry}
                            onChange={(e) => setSelectedExpiry(e.target.value)}
                            className="px-2.5 py-1.5 border rounded-lg text-black dark:text-white bg-gray-50 dark:bg-gray-700 dark:border-gray-600 text-sm focus:outline-none"
                          >
                            {optionChain?.expirationDates?.map((d: string) => (
                              <option key={d} value={d}>
                                {new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        <button
                          onClick={() => setShowGreeks(!showGreeks)}
                          className={`flex items-center space-x-1 px-3 py-1.5 rounded-full border text-xs font-bold transition ${showGreeks ? 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900' : 'bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-700 dark:border-gray-600'}`}
                        >
                          <span>Σ Option Greeks</span>
                        </button>
                      </div>

                      {/* Chain Table */}
                      {isLoadingOptions ? (
                        <div className="py-12 text-center text-gray-500 dark:text-gray-400">Loading live option contracts...</div>
                      ) : (
                        <div className="overflow-x-auto border dark:border-gray-700 rounded-lg max-h-[450px] overflow-y-auto">
                          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-xs">
                            <thead className="bg-gray-100 dark:bg-gray-800 font-semibold sticky top-0 z-10">
                              <tr>
                                <th colSpan={showGreeks ? 5 : 3} className="px-3 py-2 text-center border-r dark:border-gray-700 text-green-700 dark:text-green-400">CALLS (CE)</th>
                                <th className="px-3 py-2 text-center text-gray-700 dark:text-gray-300">STRIKE</th>
                                <th colSpan={showGreeks ? 5 : 3} className="px-3 py-2 text-center border-l dark:border-gray-700 text-red-700 dark:text-red-400">PUTS (PE)</th>
                              </tr>
                              <tr className="bg-gray-50 dark:bg-gray-800 border-b dark:border-gray-700">
                                {showGreeks && (
                                  <>
                                    <th className="px-2 py-1 text-center font-medium text-gray-500">Delta</th>
                                    <th className="px-2 py-1 text-center font-medium text-gray-500">Theta</th>
                                    <th className="px-2 py-1 text-center font-medium text-gray-500">Vega</th>
                                  </>
                                )}
                                <th className="px-2 py-1 text-right font-medium text-gray-500">OI</th>
                                <th className="px-2 py-1 text-right font-medium text-gray-900 dark:text-white border-r dark:border-gray-700">Call LTP</th>
                                
                                <th className="px-2 py-1 text-center font-bold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-900/50">Strike Price</th>
                                
                                <th className="px-2 py-1 text-left font-medium text-gray-900 dark:text-white border-l dark:border-gray-700">Put LTP</th>
                                <th className="px-2 py-1 text-left font-medium text-gray-500">OI</th>
                                {showGreeks && (
                                  <>
                                    <th className="px-2 py-1 text-center font-medium text-gray-500">Vega</th>
                                    <th className="px-2 py-1 text-center font-medium text-gray-500">Theta</th>
                                    <th className="px-2 py-1 text-center font-medium text-gray-500">Delta</th>
                                  </>
                                )}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                              {optionChain?.chain?.map((item: any, idx: number) => {
                                const isCallITM = item.strike < selectedAsset.regularMarketPrice;
                                const isPutITM = item.strike > selectedAsset.regularMarketPrice;
                                
                                // Open Interest Ratio bar variables
                                const totalOI = item.call.openInterest + item.put.openInterest;
                                const callOIPct = totalOI > 0 ? (item.call.openInterest / totalOI) * 100 : 50;
                                const putOIPct = totalOI > 0 ? (item.put.openInterest / totalOI) * 100 : 50;

                                return (
                                  <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                    {/* CALLS */}
                                    {showGreeks && (
                                      <>
                                        <td className={`px-2 py-2 text-center text-gray-600 dark:text-gray-400 ${isCallITM ? 'bg-yellow-50/30 dark:bg-yellow-950/10' : ''}`}>{item.call.delta.toFixed(2)}</td>
                                        <td className={`px-2 py-2 text-center text-gray-600 dark:text-gray-400 ${isCallITM ? 'bg-yellow-50/30 dark:bg-yellow-950/10' : ''}`}>{item.call.theta.toFixed(3)}</td>
                                        <td className={`px-2 py-2 text-center text-gray-600 dark:text-gray-400 ${isCallITM ? 'bg-yellow-50/30 dark:bg-yellow-950/10' : ''}`}>{item.call.vega.toFixed(3)}</td>
                                      </>
                                    )}
                                    <td className={`px-2 py-2 text-right text-gray-500 ${isCallITM ? 'bg-yellow-50/30 dark:bg-yellow-950/10' : ''}`}>
                                      {item.call.openInterest.toLocaleString()}
                                    </td>
                                    <td className={`px-2 py-2 text-right border-r dark:border-gray-700 ${isCallITM ? 'bg-yellow-50/50 dark:bg-yellow-950/20' : ''}`}>
                                      <button
                                        onClick={() => loadOptionForTrade(item.call.symbol)}
                                        className="text-green-600 dark:text-green-400 hover:underline font-bold"
                                      >
                                        {formatCurrency(convertAmountFrontend(item.call.price, selectedAsset.currency, userCurrency), userCurrency)}
                                      </button>
                                    </td>

                                    {/* STRIKE */}
                                    <td className="px-2 py-2 text-center font-bold bg-gray-100 dark:bg-gray-800/80 text-gray-900 dark:text-white">
                                      {formatCurrency(convertAmountFrontend(item.strike, selectedAsset.currency, userCurrency), userCurrency)}
                                      {/* Call/Put OI visualization bar exactly like the screenshot */}
                                      <div className="w-12 h-1 bg-gray-200 dark:bg-gray-750 rounded-full overflow-hidden flex mx-auto mt-1" title={`Call OI vs Put OI`}>
                                        <div className="bg-green-500 h-full" style={{ width: `${callOIPct}%` }}></div>
                                        <div className="bg-red-500 h-full" style={{ width: `${putOIPct}%` }}></div>
                                      </div>
                                    </td>

                                    {/* PUTS */}
                                    <td className={`px-2 py-2 text-left border-l dark:border-gray-700 ${isPutITM ? 'bg-yellow-50/50 dark:bg-yellow-950/20' : ''}`}>
                                      <button
                                        onClick={() => loadOptionForTrade(item.put.symbol)}
                                        className="text-red-600 dark:text-red-400 hover:underline font-bold"
                                      >
                                        {formatCurrency(convertAmountFrontend(item.put.price, selectedAsset.currency, userCurrency), userCurrency)}
                                      </button>
                                    </td>
                                    <td className={`px-2 py-2 text-left text-gray-500 ${isPutITM ? 'bg-yellow-50/30 dark:bg-yellow-950/10' : ''}`}>
                                      {item.put.openInterest.toLocaleString()}
                                    </td>
                                    {showGreeks && (
                                      <>
                                        <td className={`px-2 py-2 text-center text-gray-600 dark:text-gray-400 ${isPutITM ? 'bg-yellow-50/30 dark:bg-yellow-950/10' : ''}`}>{item.put.vega.toFixed(3)}</td>
                                        <td className={`px-2 py-2 text-center text-gray-600 dark:text-gray-400 ${isPutITM ? 'bg-yellow-50/30 dark:bg-yellow-950/10' : ''}`}>{item.put.theta.toFixed(3)}</td>
                                        <td className={`px-2 py-2 text-center text-gray-600 dark:text-gray-400 ${isPutITM ? 'bg-yellow-50/30 dark:bg-yellow-950/10' : ''}`}>{item.put.delta.toFixed(2)}</td>
                                      </>
                                    )}
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                      
                      <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 p-2.5 rounded-lg border dark:border-gray-700">
                        <Coins className="w-4 h-4 text-blue-500" />
                        <span>Click any Call or Put premium price to select that contract and open the trade panel.</span>
                      </div>
                    </div>
                  )}

                </div>
              )}
            </div>

            {/* Holdings & Pending Orders Tabs */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
              <div className="px-6 py-4 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
                <div className="flex space-x-4">
                  <button
                    onClick={() => setDashboardTab('holdings')}
                    className={`pb-1 text-lg font-bold border-b-2 transition ${dashboardTab === 'holdings' ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400' : 'border-transparent text-gray-500 hover:text-black dark:hover:text-white'}`}
                  >
                    Your Portfolio
                  </button>
                  <button
                    onClick={() => setDashboardTab('pending')}
                    className={`pb-1 text-lg font-bold border-b-2 transition flex items-center ${dashboardTab === 'pending' ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400' : 'border-transparent text-gray-500 hover:text-black dark:hover:text-white'}`}
                  >
                    Pending Orders
                    {portfolio?.pendingOrders?.length > 0 && (
                      <span className="ml-1.5 px-2 py-0.5 text-xs font-bold bg-orange-500 text-white rounded-full shadow-sm">
                        {portfolio.pendingOrders.length}
                      </span>
                    )}
                  </button>
                </div>
                <span className="text-xs text-gray-450 dark:text-gray-500">Live Syncing 3s</span>
              </div>

              {/* Tab 1: Holdings Table */}
              {dashboardTab === 'holdings' && (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800/80">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Asset</th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Shares</th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Avg Price</th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Current Price</th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Value</th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Return</th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {portfolio?.holdings?.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-12 text-center text-sm text-gray-500 dark:text-gray-400">No assets in portfolio yet. Search and buy above!</td>
                        </tr>
                      ) : (
                        portfolio?.holdings?.map((h: any, i: number) => (
                          <tr key={i} className="hover:bg-gray-55 dark:hover:bg-gray-700/30 cursor-pointer transition-colors" onClick={() => {
                            selectAsset(h.symbol);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}>
                            <td className="px-6 py-4 whitespace-nowrap font-bold text-blue-600 dark:text-blue-400">{h.symbol}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm">{h.shares}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm">{formatCurrency(h.average_price, userCurrency)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm transition-colors">{formatCurrency(h.currentPrice, userCurrency)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold transition-colors">{formatCurrency(h.totalValue, userCurrency)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${h.return >= 0 ? 'bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-400'}`}>
                                {h.return >= 0 ? '+' : '-'}{formatCurrency(Math.abs(h.return), userCurrency)} ({h.returnPct.toFixed(2)}%)
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold">
                              <button className="bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 px-3 py-1 rounded shadow-sm border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                                 Trade
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Tab 2: Pending Orders Table */}
              {dashboardTab === 'pending' && (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800/80">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Asset</th>
                        <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                        <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Order Type</th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Shares</th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Target Price</th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Current Price</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Placed Date</th>
                        <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                      {portfolio?.pendingOrders?.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">No pending Limit or Stop Loss orders.</td>
                        </tr>
                      ) : (
                        portfolio?.pendingOrders?.map((o: any) => (
                          <tr
                            key={o.id}
                            className="hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer transition-colors"
                            onClick={() => {
                              selectAsset(o.symbol);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                          >
                            <td className="px-6 py-4 whitespace-nowrap font-bold text-blue-600 dark:text-blue-400">{o.symbol}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <span className={`inline-block px-2.5 py-0.5 text-xs font-bold rounded-full ${o.type === 'BUY' ? 'bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-400'}`}>
                                {o.type}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center text-gray-700 dark:text-gray-300 font-medium">
                              {o.order_type === 'STOP_LOSS' ? 'Stop Loss' : 'Limit'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">{o.shares}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-right font-semibold">
                              {formatCurrency(o.price, userCurrency)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right font-semibold text-gray-900 dark:text-white">
                              {o.currentPrice ? formatCurrency(o.currentPrice, userCurrency) : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-gray-500 dark:text-gray-400 text-xs">
                              {new Date(o.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center space-x-2" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => handleModifyClick(o)}
                                className="bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400 px-3 py-1 rounded shadow-sm border border-blue-200 dark:border-blue-900 hover:bg-blue-100 dark:hover:bg-blue-950/50 transition font-bold"
                              >
                                Modify
                              </button>
                              <button
                                onClick={() => cancelPendingOrder(o.id)}
                                className="bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-455 px-3 py-1 rounded shadow-sm border border-red-200 dark:border-red-900 hover:bg-red-100 dark:hover:bg-red-950/50 transition font-bold"
                              >
                                Cancel
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>

          {/* Right Column: AI mentor teaser & Transaction History */}
          <div className="space-y-8">
            


            {/* Transaction History sidebar */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
              <div className="px-6 py-4 border-b dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                <h2 className="text-lg font-bold">Recent History</h2>
              </div>
              <ul className="divide-y dark:divide-gray-700 divide-gray-200 dark:divide-gray-700">
                {portfolio?.transactions?.length === 0 ? (
                  <li className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">No transactions recorded yet.</li>
                ) : (
                  portfolio?.transactions?.map((t: any, i: number) => (
                    <li key={i} className="px-6 py-3.5 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-750 cursor-pointer transition-colors" onClick={() => {
                      selectAsset(t.symbol);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}>
                      <div>
                        <p className="text-sm font-bold">
                          <span className={t.type === 'BUY' ? 'text-green-600' : 'text-red-600'}>{t.type}</span> {t.symbol}
                        </p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">{new Date(t.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{t.shares} units</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold">@ {formatCurrency(t.price, userCurrency)}</p>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </div>

          </div>

        </div>
      </main>

      {/* Modify Order Modal */}
      {modifyingOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-2xl max-w-md w-full overflow-hidden transform transition-all p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Modify Order</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Modify your pending <span className="font-bold text-blue-600 dark:text-blue-400">{modifyingOrder.order_type === 'STOP_LOSS' ? 'Stop Loss' : 'Limit'}</span> order for <span className="font-bold text-gray-900 dark:text-white">{modifyingOrder.symbol}</span>.
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-450 dark:text-gray-500 uppercase tracking-wider mb-2">
                  Shares / Contracts
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={modifyShares}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, '');
                    setModifyShares(val === '' ? 0 : parseInt(val));
                  }}
                  onBlur={() => {
                    if (!modifyShares || modifyShares < 1) setModifyShares(1);
                  }}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-250 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-450 dark:text-gray-500 uppercase tracking-wider mb-2">
                  Target Price ({userCurrency})
                </label>
                <input
                  type="number"
                  step="any"
                  value={modifyPrice}
                  onChange={(e) => setModifyPrice(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-250 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white font-bold"
                />
                {modifyingOrder.currentPrice !== undefined && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Current Live Price: <span className="font-semibold text-blue-600 dark:text-blue-400">{formatCurrency(modifyingOrder.currentPrice, userCurrency)}</span>
                  </p>
                )}
              </div>
            </div>

            <div className="mt-8 flex space-x-3">
              <button
                onClick={() => setModifyingOrder(null)}
                className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-white font-bold rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={submitModifyOrder}
                disabled={isModifyingOrder}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isModifyingOrder ? 'Modifying...' : 'Confirm Modify'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
