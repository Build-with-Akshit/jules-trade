"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, ArrowLeft, Send, Settings, Check, ChevronDown, ChevronUp } from 'lucide-react';

export default function Course() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Welcome to your personalized trading course! I am your AI Mentor. I will guide you step-by-step. Let me know if you have any questions about the course modules!'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Settings / BYOK
  const [showSettings, setShowSettings] = useState(false);
  const [provider, setProvider] = useState('openai');
  const [apiKey, setApiKey] = useState('');

  // Course Content
  const [expandedModule, setExpandedModule] = useState<number | null>(0);

  const modules = [
    {
      title: "1. Basics of the Stock Market",
      content: `A stock market is where buyers and sellers trade shares of public companies.
      When you buy a "share," you own a tiny piece of that company.

      Why do prices change?
      Supply and demand! If a company is doing well and many people want to buy its stock, the price goes up. If people want to sell, the price goes down.`
    },
    {
      title: "2. How to Make a Trade",
      content: `In our app, search for a stock symbol (like AAPL for Apple).
      You will see a "Current Price."

      Select how many shares you want and click "BUY".
      The money is deducted from your "Available Cash" and the stock goes into your "Portfolio."

      To make a profit, you wait for the "Current Price" to go higher than your "Avg Price," then click "SELL."`
    },
    {
      title: "3. Market vs Limit Orders",
      content: `Right now, you are executing "Market Orders". This means you buy the stock immediately at whatever the current price is.

      A "Limit Order" (advanced) lets you set a specific price you want to buy at. The trade won't happen unless the stock drops to your specific price. Keep this in mind as you learn!`
    }
  ];

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (!savedUser) {
      router.push('/login');
      return;
    }
    setUser(JSON.parse(savedUser));

    // Load saved settings
    const savedProvider = localStorage.getItem('ai_provider');
    const savedKey = localStorage.getItem('ai_key');
    if (savedProvider) setProvider(savedProvider);
    if (savedKey) setApiKey(savedKey);
  }, [router]);

  const saveSettings = () => {
    localStorage.setItem('ai_provider', provider);
    localStorage.setItem('ai_key', apiKey);
    setShowSettings(false);

    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'assistant',
      content: `Settings saved! You are now using ${provider} for your mentor. How can I help you understand the course?`
    }]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const newMsg = { id: Date.now().toString(), role: 'user', content: input };
    setMessages(prev => [...prev, newMsg]);
    setInput('');
    setIsLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/course/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, newMsg],
          userId: user.id,
          provider: provider,
          apiKey: apiKey
        })
      });

      const data = await res.text();

      if (!res.ok) {
        try {
          const errData = JSON.parse(data);
          setErrorMsg(errData.error || 'Connection error');
        } catch {
          setErrorMsg('Connection error');
        }
        return;
      }

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.replace(/^0:"/, '').replace(/"\n$/, '').replace(/\\n/g, '\n')
      }]);
    } catch (err) {
      setErrorMsg('Error communicating with Mentor.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!user) return <div className="min-h-screen flex items-center justify-center text-black">Loading...</div>;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <button onClick={() => router.push('/dashboard')} className="text-gray-600 hover:text-black flex items-center">
              <ArrowLeft className="w-5 h-5 mr-2" />
              Dashboard
            </button>
            <div className="flex items-center text-blue-600 font-bold text-xl">
              <BookOpen className="mr-2" />
              Learning Center
            </div>
            <button onClick={() => setShowSettings(!showSettings)} className="text-sm font-medium text-gray-600 hover:text-blue-600 flex items-center">
              <Settings className="w-5 h-5 mr-1" />
              AI Settings
            </button>
          </div>
        </div>
      </nav>

      {/* Settings Modal */}
      {showSettings && (
        <div className="absolute right-4 top-20 bg-white border shadow-xl rounded-lg p-6 z-50 w-80">
           <h3 className="font-bold text-lg mb-4">Bring Your Own Key (BYOK)</h3>
           <div className="space-y-4">
              <div>
                 <label className="block text-sm font-medium text-gray-700">AI Provider</label>
                 <select
                    value={provider}
                    onChange={(e) => setProvider(e.target.value)}
                    className="mt-1 block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-black"
                 >
                    <option value="openai">OpenAI (ChatGPT)</option>
                    <option value="anthropic">Anthropic (Claude)</option>
                    <option value="google">Google (Gemini)</option>
                    <option value="openrouter">OpenRouter (Any)</option>
                 </select>
              </div>
              <div>
                 <label className="block text-sm font-medium text-gray-700">API Key</label>
                 <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-..."
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-black"
                 />
              </div>
              <button
                onClick={saveSettings}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                Save
              </button>
           </div>
        </div>
      )}

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Left Column: Structured Notes */}
        <div className="bg-white rounded-lg shadow-sm border p-6 overflow-y-auto max-h-[calc(100vh-120px)]">
           <h2 className="text-2xl font-bold mb-6 text-blue-800 border-b pb-2">Trading Course</h2>
           <div className="space-y-4">
              {modules.map((mod, i) => (
                 <div key={i} className="border rounded-lg overflow-hidden">
                    <button
                       onClick={() => setExpandedModule(expandedModule === i ? null : i)}
                       className="w-full px-4 py-3 bg-gray-50 flex justify-between items-center hover:bg-gray-100 transition text-left font-bold"
                    >
                       {mod.title}
                       {expandedModule === i ? <ChevronUp className="w-5 h-5 text-gray-500"/> : <ChevronDown className="w-5 h-5 text-gray-500"/>}
                    </button>
                    {expandedModule === i && (
                       <div className="p-4 bg-white whitespace-pre-line text-sm text-gray-700 leading-relaxed border-t">
                          {mod.content}
                       </div>
                    )}
                 </div>
              ))}
           </div>
        </div>

        {/* Right Column: AI Chat */}
        <div className="flex flex-col h-full max-h-[calc(100vh-120px)]">
            <div className="flex-1 bg-white rounded-t-lg shadow-sm border p-4 overflow-y-auto">
            {errorMsg && (
                <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4 text-sm text-center">
                {errorMsg}
                </div>
            )}

            {messages.map((m: any) => (
                <div key={m.id} className={`mb-4 flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
                    m.role === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-none'
                    : 'bg-gray-100 text-gray-900 rounded-tl-none border'
                }`}>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{m.content}</p>
                </div>
                </div>
            ))}
            {isLoading && (
                <div className="flex justify-start mb-4">
                <div className="bg-gray-100 text-gray-500 rounded-2xl rounded-tl-none px-4 py-3 text-sm flex items-center">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce mr-1"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce mr-1" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                </div>
                </div>
            )}
            <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSubmit} className="relative flex items-center mt-2">
            <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={apiKey ? "Ask about the course..." : "Set API Key to ask questions..."}
                className="w-full pl-4 pr-12 py-4 rounded-b-lg border shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-black bg-white"
                disabled={isLoading}
            />
            <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="absolute right-3 p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 transition"
            >
                <Send className="w-5 h-5" />
            </button>
            </form>
        </div>

      </main>
    </div>
  );
}
