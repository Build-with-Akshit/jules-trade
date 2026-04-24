"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TrendingUp, TrendingDown, Flame, GraduationCap, ArrowLeft, Briefcase } from 'lucide-react';

export default function Explore() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (!savedUser) {
      router.push('/login');
      return;
    }

    const fetchExplore = async () => {
      try {
        const res = await fetch('/api/market/explore');
        const result = await res.json();
        if (!result.error) {
          setData(result);
        }
      } catch (err) {
        console.error('Failed to load explore data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchExplore();
  }, [router]);

  const goToDashboardWithAsset = (symbol: string) => {
    localStorage.setItem('preselect_asset', symbol);
    router.push('/dashboard');
  };

  const AssetCard = ({ asset, isLoser = false }: { asset: any, isLoser?: boolean }) => {
    if (!asset) return null;
    return (
      <div
        onClick={() => goToDashboardWithAsset(asset.symbol)}
        className="bg-white rounded-lg shadow-sm border p-4 hover:shadow-md hover:border-blue-300 cursor-pointer transition flex justify-between items-center"
      >
        <div>
          <h4 className="font-bold text-lg text-blue-700">{asset.symbol}</h4>
          <p className="text-sm text-gray-500 truncate max-w-[150px]">{asset.shortName || asset.longName}</p>
        </div>
        <div className="text-right">
          <p className="font-bold">${asset.regularMarketPrice?.toFixed(2) || '---'}</p>
          <p className={`text-sm flex items-center justify-end ${asset.regularMarketChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {asset.regularMarketChange >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
            {asset.regularMarketChangePercent?.toFixed(2)}%
          </p>
        </div>
      </div>
    );
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center text-black">Loading Market Data...</div>;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-12">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <button onClick={() => router.push('/dashboard')} className="text-gray-600 hover:text-black flex items-center">
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Dashboard
            </button>
            <div className="flex items-center text-blue-600 font-bold text-xl">
              <Briefcase className="mr-2" />
              Market Explorer
            </div>
            <div className="w-24"></div> {/* Spacer */}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-12">

        {/* Beginner Choices */}
        <section>
          <div className="flex items-center mb-4">
            <GraduationCap className="w-6 h-6 text-blue-600 mr-2" />
            <h2 className="text-2xl font-bold">Perfect Choice for Beginners</h2>
          </div>
          <p className="text-gray-600 mb-6">Large, stable companies that are great for learning the ropes.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data?.beginner?.map((asset: any) => (
              <AssetCard key={asset.symbol} asset={asset} />
            ))}
          </div>
        </section>

        {/* Trending */}
        <section>
          <div className="flex items-center mb-4">
            <Flame className="w-6 h-6 text-orange-500 mr-2" />
            <h2 className="text-2xl font-bold">Trending Now</h2>
          </div>
          <p className="text-gray-600 mb-6">The most active and discussed assets in the market right now.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {data?.trending?.map((asset: any) => (
              <AssetCard key={asset.symbol} asset={asset} />
            ))}
            {(!data?.trending || data.trending.length === 0) && <p className="text-gray-500 text-sm">Trending data unavailable.</p>}
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
           {/* Top Gainers */}
           <section>
              <div className="flex items-center mb-4">
                <TrendingUp className="w-6 h-6 text-green-600 mr-2" />
                <h2 className="text-2xl font-bold">Top Gainers</h2>
              </div>
              <p className="text-gray-600 mb-6">Stocks making the biggest upward moves today.</p>
              <div className="space-y-4">
                {data?.gainers?.map((asset: any) => (
                  <AssetCard key={asset.symbol} asset={asset} />
                ))}
                {(!data?.gainers || data.gainers.length === 0) && <p className="text-gray-500 text-sm">Gainer data unavailable.</p>}
              </div>
           </section>

           {/* Top Losers */}
           <section>
              <div className="flex items-center mb-4">
                <TrendingDown className="w-6 h-6 text-red-600 mr-2" />
                <h2 className="text-2xl font-bold">Top Losers</h2>
              </div>
              <p className="text-gray-600 mb-6">Stocks experiencing the biggest drops today.</p>
              <div className="space-y-4">
                {data?.losers?.map((asset: any) => (
                  <AssetCard key={asset.symbol} asset={asset} isLoser={true} />
                ))}
                {(!data?.losers || data.losers.length === 0) && <p className="text-gray-500 text-sm">Loser data unavailable.</p>}
              </div>
           </section>
        </div>

      </main>
    </div>
  );
}
