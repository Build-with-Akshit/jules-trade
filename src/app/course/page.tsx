"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, ArrowLeft, Send } from 'lucide-react';

export default function Course() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Welcome to your personalized trading course! I am your AI Mentor. I will guide you step-by-step in your preferred language. Are you ready to learn the basics of the market, or do you have a specific question about a trade?'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (!savedUser) {
      router.push('/login');
      return;
    }
    setUser(JSON.parse(savedUser));
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const newMsg = { id: Date.now().toString(), role: 'user', content: input };
    setMessages(prev => [...prev, newMsg]);
    setInput('');
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/course/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, newMsg], userId: user.id })
      });

      const data = await res.text();

      if (!res.ok) {
        try {
          const errData = JSON.parse(data);
          setError(errData.error || 'Connection error');
        } catch {
          setError('Connection error');
        }
        return;
      }

      // Basic handling of stream/mock text response
      // For real streaming, you'd use a reader, but since we are handling text streams or mock texts:
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.replace(/^0:"/, '').replace(/"\n$/, '').replace(/\\n/g, '\n') // basic stream cleanup if streamText was used
      }]);
    } catch (err) {
      setError('Error communicating with Mentor.');
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
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <button onClick={() => router.push('/dashboard')} className="text-gray-600 hover:text-black flex items-center">
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Dashboard
            </button>
            <div className="flex items-center text-blue-600 font-bold text-xl">
              <BookOpen className="mr-2" />
              AI Mentor
            </div>
            <div className="text-sm text-gray-500">
              Language: <span className="font-bold text-black">{user.language}</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 flex flex-col">
        {error && (
          <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-4 text-sm text-center">
            {error}
          </div>
        )}

        <div className="flex-1 bg-white rounded-lg shadow-sm border p-4 mb-4 overflow-y-auto max-h-[calc(100vh-200px)]">
          {messages.map((m: any) => (
            <div key={m.id} className={`mb-4 flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
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
              <div className="bg-gray-100 text-gray-500 rounded-2xl rounded-tl-none px-4 py-3 text-sm">
                Thinking...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSubmit} className="relative flex items-center">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask your mentor a question..."
            className="w-full pl-4 pr-12 py-4 rounded-full border shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-black"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="absolute right-2 p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 transition"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </main>
    </div>
  );
}
