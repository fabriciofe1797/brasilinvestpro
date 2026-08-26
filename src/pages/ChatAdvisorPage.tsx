import React, { useState, useRef, useEffect } from 'react';
import { useChatAdvisor } from '../hooks/useChatAdvisor';
import { formatCurrency } from '../lib/utils';
import {
  Send,
  Trash2,
  Bot,
  User,
  TrendingUp,
  Wallet,
  Activity,
  Sparkles,
} from 'lucide-react';

const ChatAdvisorPage: React.FC = () => {
  const { messages, isTyping, context, quickSuggestions, sendMessage, clearChat } = useChatAdvisor();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;
    sendMessage(input);
    setInput('');
    inputRef.current?.focus();
  };

  const handleQuickSuggestion = (suggestion: string) => {
    sendMessage(suggestion);
  };

  // Render message content with basic markdown-like formatting
  const renderContent = (content: string) => {
    return content.split('\n').map((line, i) => {
      // Bold text
      const formatted = line.replace(/\*\*(.+?)\*\*/g, '<strong class="text-white font-bold">$1</strong>');
      // Italic text
      const italicFormatted = formatted.replace(/_(.+?)_/g, '<em class="text-gray-400 italic">$1</em>');
      // Inline code
      const codeFormatted = italicFormatted.replace(/`(.+?)`/g, '<code class="px-1 py-0.5 rounded bg-white/10 text-emerald-400 text-[11px] font-mono">$1</code>');

      if (!line.trim()) return <br key={i} />;
      return (
        <p key={i} className="mb-1" dangerouslySetInnerHTML={{ __html: codeFormatted }} />
      );
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">Chat Advisor</h1>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
              Assistente IA • Dados em tempo real
            </p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearChat}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-all text-xs font-bold"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Limpar
          </button>
        )}
      </div>

      <div className="flex flex-1 gap-6 min-h-0">
        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-[#0B1C17] border border-white/5 rounded-2xl overflow-hidden">
          {/* Quick Suggestions */}
          {messages.length === 0 && (
            <div className="p-6 border-b border-white/5">
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-3">
                Sugestoes rapidas
              </p>
              <div className="flex flex-wrap gap-2">
                {quickSuggestions.map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => handleQuickSuggestion(suggestion)}
                    className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-gray-300 text-xs font-medium hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-emerald-400 transition-all"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-emerald-500/20 to-blue-500/20 flex items-center justify-center mb-4">
                  <Sparkles className="w-8 h-8 text-emerald-500" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Ola! Sou seu Chat Advisor</h3>
                <p className="text-sm text-gray-500 max-w-md">
                  Pergunte sobre sua carteira, dividendos, P/L, analise de ativos, ou conceitos financeiros.
                  Uso dados reais do seu portfolio para responder.
                </p>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    msg.role === 'user'
                      ? 'bg-emerald-500/20 border border-emerald-500/30 text-white'
                      : 'bg-white/5 border border-white/10 text-gray-300'
                  }`}
                >
                  <div className="text-sm leading-relaxed">
                    {renderContent(msg.content)}
                  </div>
                  <p className="text-[9px] text-gray-600 mt-2">
                    {new Date(msg.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-gray-400" />
                  </div>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-4 border-t border-white/5 bg-black/20">
            <div className="flex gap-3">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Pergunte sobre sua carteira, dividendos, analise de ativos..."
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
                disabled={isTyping}
              />
              <button
                type="submit"
                disabled={!input.trim() || isTyping}
                className="px-4 py-3 rounded-xl bg-emerald-500 text-black font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-emerald-400 transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>

        {/* Sidebar - Context Summary */}
        <div className="hidden lg:block w-64 space-y-4">
          <div className="bg-[#0B1C17] border border-white/5 rounded-2xl p-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Wallet className="w-3.5 h-3.5" />
              Carteira
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-[10px] text-gray-500">Valor Total</span>
                <span className="text-[10px] font-bold text-white">{formatCurrency(context.totalMarketValue, 'BRL')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[10px] text-gray-500">P/L Total</span>
                <span className={`text-[10px] font-bold ${context.totalProfitLoss >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {context.totalProfitLossPct >= 0 ? '+' : ''}{context.totalProfitLossPct.toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[10px] text-gray-500">Renda/Mes</span>
                <span className="text-[10px] font-bold text-emerald-400">{formatCurrency(context.monthlyIncome, 'BRL')}</span>
              </div>
            </div>
          </div>

          <div className="bg-[#0B1C17] border border-white/5 rounded-2xl p-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Activity className="w-3.5 h-3.5" />
              Saude
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-[10px] text-gray-500">Health Score</span>
                <span className={`text-[10px] font-bold ${context.healthScore >= 60 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {context.healthScore}/100
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[10px] text-gray-500">Streak</span>
                <span className="text-[10px] font-bold text-white">{context.streak} meses</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[10px] text-gray-500">Ativos</span>
                <span className="text-[10px] font-bold text-white">{context.portfolio.length}</span>
              </div>
            </div>
          </div>

          <div className="bg-[#0B1C17] border border-white/5 rounded-2xl p-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5" />
              Top Ativos
            </h3>
            <div className="space-y-2">
              {context.topAssets.slice(0, 5).map((a) => (
                <div key={a.ticker} className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-white">{a.ticker}</span>
                  <span className="text-[10px] text-gray-500">{a.weight.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatAdvisorPage;
