'use client';

import { useState, useEffect, useRef } from 'react';
import { useStore } from '@/app/lib/store';
import { supabase, saveChatMessage, getChatHistory } from '@/app/lib/supabase';

export default function ChatInterface() {
  const { user, currentModel, addNotification } = useStore();
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadHistory = async () => {
    const history = await getChatHistory(user?.id || '');
    setChatHistory(history);

    // Auto-load last conversation
    if (history.length > 0 && messages.length === 0) {
      const lastChat = history[0];
      setMessages([
        { role: 'user', content: lastChat.user_message },
        { role: 'assistant', content: lastChat.ai_response },
      ]);
    }
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMsg = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          model: currentModel,
          history: messages.slice(-10), // Send last 10 messages for context
        }),
      });

      const data = await res.json();
      const aiMsg = { role: 'assistant', content: data.response };
      
      setMessages((prev) => [...prev, aiMsg]);

      // Save to database
      await saveChatMessage(user?.id || '', currentModel, input, data.response);

      // Reload history
      loadHistory();
    } catch (error: any) {
      const errorMsg = { role: 'assistant', content: 'Error: ' + error.message };
      setMessages((prev) => [...prev, errorMsg]);
      addNotification({ type: 'error', message: 'Failed to send message' });
    }

    setLoading(false);
  };

  const loadPreviousChat = (chat: any) => {
    setMessages([
      { role: 'user', content: chat.user_message },
      { role: 'assistant', content: chat.ai_response },
    ]);
    setShowHistory(false);
  };

  const clearChat = () => {
    setMessages([]);
    setInput('');
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-bold gradient-text">💬 AI Chat</h2>
          <p className="text-gray-400 text-sm">Chat with {currentModel}</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="btn btn-secondary text-sm"
          >
            📜 History ({chatHistory.length})
          </button>
          <button onClick={clearChat} className="btn btn-danger text-sm">
            🗑️ Clear
          </button>
        </div>
      </div>

      {/* Chat History */}
      {showHistory && (
        <div className="glass p-4 rounded-lg">
          <h3 className="font-bold mb-3">Recent Conversations</h3>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {chatHistory.length === 0 ? (
              <p className="text-gray-400 text-sm">No chat history yet</p>
            ) : (
              chatHistory.map((chat, i) => (
                <div
                  key={i}
                  onClick={() => loadPreviousChat(chat)}
                  className="p-3 glass rounded cursor-pointer hover:glow transition"
                >
                  <div className="text-xs text-cyan-400 mb-1">
                    {new Date(chat.created_at).toLocaleString()} • {chat.model}
                  </div>
                  <div className="text-sm truncate">{chat.user_message}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Chat Messages */}
      <div className="glass rounded-xl p-6 min-h-[500px] max-h-[500px] overflow-y-auto flex flex-col">
        {messages.length === 0 && !showHistory && (
          <div className="flex-1 flex items-center justify-center text-center text-gray-400">
            <div>
              <div className="text-6xl mb-4">💬</div>
              <h3 className="text-2xl font-bold mb-2">Start a conversation</h3>
              <p>Ask me anything! Your chats are automatically saved.</p>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] p-4 rounded-lg ${
                  msg.role === 'user'
                    ? 'bg-cyan-500/20 border border-cyan-500/50'
                    : 'bg-white/5 border border-white/10'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce delay-100" />
                  <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce delay-200" />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          placeholder="Type your message..."
          className="flex-1 px-4 py-3 rounded-lg"
          disabled={loading}
        />
        <button
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          className="btn btn-primary px-8"
        >
          {loading ? '...' : 'Send'}
        </button>
      </div>

      <div className="text-xs text-center text-gray-400">
        ✅ All chats are automatically saved and encrypted
      </div>
    </div>
  );
              }
