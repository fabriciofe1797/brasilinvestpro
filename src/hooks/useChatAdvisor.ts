import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useStore } from '../store/useStore';
import { usePortfolioMetrics } from './usePortfolioMetrics';
import { useContributionStreak } from './useContributionStreak';
import { useHealthScore } from './useHealthScore';
import { ChatMessage, ChatContext, processMessage, quickSuggestions } from '../services/chatAdvisor';
import { getUserData, setUserData } from '../services/userData';

const DATA_KEY = 'chat_messages';
const MAX_MESSAGES = 50;

interface UseChatAdvisorResult {
  messages: ChatMessage[];
  isTyping: boolean;
  context: ChatContext;
  quickSuggestions: string[];
  sendMessage: (text: string) => void;
  clearChat: () => void;
}

export const useChatAdvisor = (): UseChatAdvisorResult => {
  const { portfolio, assets } = useStore();
  const { getToken, isSignedIn } = useAuth();
  const metrics = usePortfolioMetrics();
  const { streak } = useContributionStreak();
  const { score: healthScore } = useHealthScore();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load from Supabase on mount
  useEffect(() => {
    if (!isSignedIn) return;
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken({ template: 'supabase' });
        if (!token) return;
        const data = await getUserData(token, [DATA_KEY]);
        if (!cancelled && data[DATA_KEY] && Array.isArray(data[DATA_KEY])) {
          setMessages((data[DATA_KEY] as ChatMessage[]).slice(-MAX_MESSAGES));
        }
      } catch { /* start empty */ }
    })();
    return () => { cancelled = true; };
  }, [isSignedIn, getToken]);

  // Debounced save to Supabase
  const scheduleSave = useCallback((msgs: ChatMessage[]) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        const token = await getToken({ template: 'supabase' });
        if (!token) return;
        await setUserData(token, [{ data_key: DATA_KEY, data_value: msgs.slice(-MAX_MESSAGES) }]);
      } catch { /* ignore */ }
    }, 1000);
  }, [getToken]);

  // Save when messages change
  useEffect(() => {
    if (messages.length > 0) {
      scheduleSave(messages);
    }
  }, [messages, scheduleSave]);

  // Cleanup
  useEffect(() => {
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, []);

  // Build context
  const context: ChatContext = useMemo(() => ({
    portfolio,
    assets,
    totalMarketValue: metrics.totalMarketValue,
    totalInvested: metrics.totalInvested,
    totalProfitLoss: metrics.totalProfitLoss,
    totalProfitLossPct: metrics.totalProfitLossPct,
    monthlyIncome: metrics.monthlyIncome,
    streak,
    healthScore,
    topAssets: metrics.assets.map(a => ({
      ticker: a.ticker,
      weight: a.weight,
      profitLossPct: a.profitLossPct,
      dividendYield: a.dividendYield,
    })),
    categoryBreakdown: metrics.categoryBreakdown.map(c => ({
      category: c.category,
      weight: c.weight,
    })),
  }), [portfolio, assets, metrics, streak, healthScore]);

  const sendMessage = useCallback((text: string) => {
    if (!text.trim()) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    // Simulate typing delay (300-800ms)
    const delay = 300 + Math.random() * 500;
    setTimeout(() => {
      const response = processMessage(text, context);
      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: response,
        timestamp: new Date().toISOString(),
        context: `${portfolio.length} ativos, ${formatBRL(metrics.totalMarketValue)} total`,
      };
      setMessages(prev => [...prev, assistantMsg]);
      setIsTyping(false);
    }, delay);
  }, [context, portfolio.length, metrics.totalMarketValue]);

  const clearChat = useCallback(async () => {
    setMessages([]);
    try {
      const token = await getToken({ template: 'supabase' });
      if (token) {
        await setUserData(token, [{ data_key: DATA_KEY, data_value: [] }]);
      }
    } catch { /* ignore */ }
  }, [getToken]);

  return {
    messages,
    isTyping,
    context,
    quickSuggestions,
    sendMessage,
    clearChat,
  };
};

const formatBRL = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

