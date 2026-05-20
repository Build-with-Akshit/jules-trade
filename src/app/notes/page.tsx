"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ChevronDown, Brain, TrendingUp, Globe, Coins, Shield, Target } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';

export default function NotesPage() {
  const router = useRouter();
  const [expandedSection, setExpandedSection] = useState<string | null>('intro');

  const toggleSection = (id: string) => {
    setExpandedSection(expandedSection === id ? null : id);
  };

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-gray-900 text-[#37352f] dark:text-gray-100 transition-colors font-sans selection:bg-[#cce2ff] dark:selection:bg-blue-900">
      {/* Top Navigation */}
      <nav className="sticky top-0 z-50 bg-[#ffffff]/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-[#e9e9e7] dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-12 items-center text-sm">
            <div className="flex items-center space-x-2 text-[#787774] dark:text-gray-400">
              <button onClick={() => router.push('/course')} className="hover:text-[#37352f] dark:hover:text-white flex items-center transition-colors">
                <ArrowLeft className="w-4 h-4 mr-1" />
                Learning Center
              </button>
              <span>/</span>
              <span className="font-medium text-[#37352f] dark:text-white">Notes of Goat Trader</span>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">

        {/* Header Section */}
        <div className="mb-12 group">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 text-[#37352f] dark:text-white">
            Notes of GOAT Trader
          </h1>
          <div className="text-sm text-[#787774] dark:text-gray-400 flex items-center space-x-4 border-b border-[#e9e9e7] dark:border-gray-700 pb-6">
            <span className="flex items-center"><Target className="w-4 h-4 mr-1"/> 30+ Years Experience</span>
            <span className="flex items-center"><Shield className="w-4 h-4 mr-1"/> 15 Years Zero Loss Streak</span>
          </div>
        </div>

        {/* Content Modules */}
        <div className="space-y-6">

          {/* Module 1: Philosophy */}
          <div className="group">
            <button
              onClick={() => toggleSection('intro')}
              className="flex items-center w-full text-left py-2 hover:bg-[#f1f1ef] dark:hover:bg-gray-800 rounded-md transition-colors -ml-2 px-2"
            >
              {expandedSection === 'intro' ? (
                <ChevronDown className="w-5 h-5 text-[#979a9b] dark:text-gray-400 mr-2" />
              ) : (
                <ChevronDown className="w-5 h-5 text-[#979a9b] dark:text-gray-400 mr-2 -rotate-90 transition-transform" />
              )}
              <h2 className="text-xl font-semibold flex items-center text-[#37352f] dark:text-white">
                <Brain className="w-5 h-5 mr-2 text-pink-500" />
                Apni Trading Philosophy (Market ka asli sach)
              </h2>
            </button>
 
            {expandedSection === 'intro' && (
              <div className="pl-9 mt-4 space-y-4 text-base leading-relaxed">
                <p className="border-l-4 border-[#e9e9e7] dark:border-gray-700 pl-4 italic text-[#787774] dark:text-gray-400">
                  "Sirf trade lagana kaafi nahi hai, humara target hai <strong className="text-[#37352f] dark:text-white">Capital Protect karna aur Consistent Profits nikalna.</strong>"
                </p>
                <ol className="list-decimal pl-5 space-y-3">
                  <li>
                    <strong className="text-[#37352f] dark:text-white">Capital Preservation:</strong> Sabse pehla rule. Agar paisa bachega tabhi toh trade karoge. Stop-loss (SL) bhagwan hai. Aisa trade setup dhundho jisme Risk:Reward kam se kam 1:2 ho.
                  </li>
                  <li>
                    <strong className="text-[#37352f] dark:text-white">Patience (Sabar):</strong> 90% time trader ko sirf screen dekhni hoti hai, kuch nahi karna hota. Setup banne ka wait karo. FOMO (Fear Of Missing Out) mein entry mat lo.
                  </li>
                  <li>
                    <strong className="text-[#37352f] dark:text-white">Psychology (Mindset):</strong> Market aapke dimaag ke sath khelega. Loss hone pe revenge trading nahi karni, aur profit hone pe overconfidence mein nahi aana.
                  </li>
                </ol>
              </div>
            )}
          </div>
 
          <div className="h-[1px] bg-[#e9e9e7] dark:bg-gray-700 w-full my-8"></div>

          {/* Module 2: Stocks & Equities */}
          <div className="group">
            <button
              onClick={() => toggleSection('stocks')}
              className="flex items-center w-full text-left py-2 hover:bg-[#f1f1ef] dark:hover:bg-gray-800 rounded-md transition-colors -ml-2 px-2"
            >
              {expandedSection === 'stocks' ? (
                <ChevronDown className="w-5 h-5 text-[#979a9b] dark:text-gray-400 mr-2" />
              ) : (
                <ChevronDown className="w-5 h-5 text-[#979a9b] dark:text-gray-400 mr-2 -rotate-90 transition-transform" />
              )}
              <h2 className="text-xl font-semibold flex items-center text-[#37352f] dark:text-white">
                <TrendingUp className="w-5 h-5 mr-2 text-blue-500" />
                Stocks / Equities (Foundation)
              </h2>
            </button>
 
            {expandedSection === 'stocks' && (
              <div className="pl-9 mt-4 space-y-6 text-base leading-relaxed">
                <div className="bg-[#f1f1ef]/50 dark:bg-gray-800/50 p-4 rounded-md">
                  <h3 className="font-semibold text-lg mb-2">Basics Clear Karo</h3>
                  <ul className="list-disc pl-5 space-y-2">
                    <li><strong className="text-[#37352f] dark:text-white">Equity:</strong> Company mein hissedari (ownership).</li>
                    <li><strong className="text-[#37352f] dark:text-white">Blue-chip Stocks:</strong> Badi aur stable companies (jaise Reliance, TCS, Apple). Inme risk kam hota hai aur return steady milta hai.</li>
                    <li><strong className="text-[#37352f] dark:text-white">Penny Stocks:</strong> Bohot saste shares. (Bhai inke chakkar mein mat padna, ye wealth destroy karte hain).</li>
                  </ul>
                </div>
 
                <div>
                  <h3 className="font-semibold text-lg mb-2 flex items-center">
                    <span className="bg-[#ffe2dd] dark:bg-red-900/50 text-[#d93025] dark:text-red-400 px-2 py-0.5 rounded text-sm mr-2">Core Strategy</span>
                    Price Action (Sabse Asli Indicator)
                  </h3>
                  <p className="mb-2">Indicators (RSI, MACD) sab lagging hote hain. Asli game Price Action ka hai:</p>
                  <ul className="space-y-2">
                    <li className="flex items-start">
                      <input type="checkbox" checked readOnly className="mt-1 mr-2 accent-gray-600" />
                      <span><strong className="text-[#37352f] dark:text-white">Support & Resistance:</strong> Waha se buy karo jaha se demand aati hai (Support), waha becho jaha supply aati hai (Resistance).</span>
                    </li>
                    <li className="flex items-start">
                      <input type="checkbox" checked readOnly className="mt-1 mr-2 accent-gray-600" />
                      <span><strong className="text-[#37352f] dark:text-white">Trendlines & Channels:</strong> Trend is your friend until it bends. Hamesha trend ke direction mein trade lo.</span>
                    </li>
                    <li className="flex items-start">
                      <input type="checkbox" checked readOnly className="mt-1 mr-2 accent-gray-600" />
                      <span><strong className="text-[#37352f] dark:text-white">Candlestick Patterns:</strong> Pin bar, engulfing patterns aur doji ko pehchan na seekho at key levels.</span>
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </div>
 
          <div className="h-[1px] bg-[#e9e9e7] dark:bg-gray-700 w-full my-8"></div>

          {/* Module 3: Forex */}
          <div className="group">
            <button
              onClick={() => toggleSection('forex')}
              className="flex items-center w-full text-left py-2 hover:bg-[#f1f1ef] dark:hover:bg-gray-800 rounded-md transition-colors -ml-2 px-2"
            >
              {expandedSection === 'forex' ? (
                <ChevronDown className="w-5 h-5 text-[#979a9b] dark:text-gray-400 mr-2" />
              ) : (
                <ChevronDown className="w-5 h-5 text-[#979a9b] dark:text-gray-400 mr-2 -rotate-90 transition-transform" />
              )}
              <h2 className="text-xl font-semibold flex items-center text-[#37352f] dark:text-white">
                <Globe className="w-5 h-5 mr-2 text-green-500" />
                Forex (Foreign Exchange - Global Game)
              </h2>
            </button>

            {expandedSection === 'forex' && (
              <div className="pl-9 mt-4 space-y-6 text-base leading-relaxed">
                <p>Forex duniya ki sabse badi aur liquid market hai. Yaha currencies pairs mein trade hoti hain (e.g., EUR/USD, GBP/JPY).</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border border-[#e9e9e7] dark:border-gray-700 p-4 rounded-md">
                    <h3 className="font-semibold text-lg mb-2">Key Concepts</h3>
                    <ul className="list-disc pl-5 space-y-2 text-sm">
                      <li><strong className="text-[#37352f] dark:text-white">Pips:</strong> Price movement measure karne ka unit.</li>
                      <li><strong className="text-[#37352f] dark:text-white">Lot Size:</strong> Trade ki quantity (Standard = 1.00, Mini = 0.10, Micro = 0.01). Hamesha Micro ya Mini se start karo!</li>
                      <li><strong className="text-[#37352f] dark:text-white">Leverage:</strong> Broker se udhaar leke trade karna. Yeh double-edged sword hai. Strict risk management zaroori hai.</li>
                    </ul>
                  </div>
                  <div className="border border-[#e9e9e7] dark:border-gray-700 p-4 rounded-md">
                    <h3 className="font-semibold text-lg mb-2">Forex Pro Tricks</h3>
                    <ul className="list-disc pl-5 space-y-2 text-sm">
                      <li>Trade during overlapping sessions (London-New York overlap mein sabse zyada volume hoti hai).</li>
                      <li>Major pairs pe focus karo kyunki waha spread kam hota hai aur manipulation mushkil hai.</li>
                      <li>News Trading (NFP, CPI) mein bohot volatility hoti hai. Ya toh dur raho, ya phir news aane ke baad settle hone par trade lo.</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="h-[1px] bg-[#e9e9e7] dark:bg-gray-700 w-full my-8"></div>

          {/* Module 4: Crypto */}
          <div className="group">
            <button
              onClick={() => toggleSection('crypto')}
              className="flex items-center w-full text-left py-2 hover:bg-[#f1f1ef] dark:hover:bg-gray-800 rounded-md transition-colors -ml-2 px-2"
            >
              {expandedSection === 'crypto' ? (
                <ChevronDown className="w-5 h-5 text-[#979a9b] dark:text-gray-400 mr-2" />
              ) : (
                <ChevronDown className="w-5 h-5 text-[#979a9b] dark:text-gray-400 mr-2 -rotate-90 transition-transform" />
              )}
              <h2 className="text-xl font-semibold flex items-center text-[#37352f] dark:text-white">
                <Coins className="w-5 h-5 mr-2 text-yellow-500" />
                Crypto (High Volatility, High Reward)
              </h2>
            </button>

            {expandedSection === 'crypto' && (
              <div className="pl-9 mt-4 space-y-6 text-base leading-relaxed">
                <p>Crypto 24/7 market hai aur bohot volatile hai. Yaha 15 saal ke experience ne mujhe yeh sikhaya hai ki yaha <strong className="text-[#37352f] dark:text-white">Greed (Lalach)</strong> sabse bada dushman hai.</p>

                <div className="bg-[#eaf1fb] dark:bg-blue-900/30 p-4 rounded-md border-l-4 border-blue-500">
                  <h3 className="font-semibold text-lg mb-2 text-[#37352f] dark:text-white">GOAT Master Advice for Crypto</h3>
                  <ul className="list-disc pl-5 space-y-2">
                    <li><strong className="text-[#37352f] dark:text-white">Bitcoin (BTC) is King:</strong> Hamesha BTC ki dominance aur price action dekho altcoins mein trade lene se pehle. Agar BTC dump hota hai, toh sab dump hoga.</li>
                    <li><strong className="text-[#37352f] dark:text-white">Spot vs Futures:</strong> As a beginner, sirf Spot trading karo. Futures mein leverage se apka account liquidate (zero) ho sakta hai minute bhar mein.</li>
                    <li><strong className="text-[#37352f] dark:text-white">Take Profits (TP):</strong> Crypto mein profit book karna bohot zaroori hai. "To the moon" ke chakar mein unrealized gains wapas loss mein badal sakte hain.</li>
                    <li>Meme coins (Doge, Shiba) aur shitcoins mein sirf utna paisa dalo jitna bhoolne ke liye taiyaar ho. Yeh investment nahi, gambling hai.</li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          <div className="h-[1px] bg-[#e9e9e7] dark:bg-gray-700 w-full my-8"></div>

          {/* Module 5: Golden Rules */}
          <div className="group">
            <button
              onClick={() => toggleSection('rules')}
              className="flex items-center w-full text-left py-2 hover:bg-[#f1f1ef] dark:hover:bg-gray-800 rounded-md transition-colors -ml-2 px-2"
            >
              {expandedSection === 'rules' ? (
                <ChevronDown className="w-5 h-5 text-[#979a9b] dark:text-gray-400 mr-2" />
              ) : (
                <ChevronDown className="w-5 h-5 text-[#979a9b] dark:text-gray-400 mr-2 -rotate-90 transition-transform" />
              )}
              <h2 className="text-xl font-semibold flex items-center text-[#37352f] dark:text-white">
                <Shield className="w-5 h-5 mr-2 text-purple-500" />
                The 15-Year Undefeated Strategy
              </h2>
            </button>
 
            {expandedSection === 'rules' && (
              <div className="pl-9 mt-4 space-y-4 text-base leading-relaxed">
                <p>Mera 15 saal se loss na hone ka raaz yeh nahi ki mere trades hamesha sahi hote hain, balki mera <strong className="text-[#37352f] dark:text-white">Risk Management</strong> itna tagda hai ki losses negligible hote hain.</p>
                <div className="space-y-3">
                  <div className="flex items-start">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-bold mr-3 mt-0.5 text-gray-800 dark:text-gray-300">1</span>
                    <p><strong>The 1% Rule:</strong> Ek single trade mein apne capital ka 1% se zyada risk kabhi mat lo.</p>
                  </div>
                  <div className="flex items-start">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-bold mr-3 mt-0.5 text-gray-800 dark:text-gray-300">2</span>
                    <p><strong>Position Sizing:</strong> Apna lot size ya share quantity apne SL (Stop-loss) distance ke hisaab se calculate karo.</p>
                  </div>
                  <div className="flex items-start">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-bold mr-3 mt-0.5 text-gray-800 dark:text-gray-300">3</span>
                    <p><strong>Journal Everything:</strong> Har trade likho. Entry kyu li, exit kyu kiya, emotions kya the. Tumhara best teacher tumhara apna past data hai.</p>
                  </div>
                  <div className="flex items-start">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-bold mr-3 mt-0.5 text-gray-800 dark:text-gray-300">4</span>
                    <p><strong>Multi-Timeframe Analysis:</strong> Higher timeframe (Daily/Weekly) trend check karne ke liye, aur lower timeframe (15m/1H) entry refine karne ke liye.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
 
        </div>
      </main>
    </div>
  );
}
