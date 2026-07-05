/**
 * useExchangeRatePolling — Polling automatico da taxa EUR/BRL
 * 
 * Busca a taxa de cambio a cada 5 minutos e mantem historico
 * dos ultimos pontos para exibicao no grafico do Dashboard.
 * Integra-se com o useStore para atualizar settings.exchangeRate.
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useStore } from '../store/useStore';
import { getExchangeRates } from '../services/database';

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutos
const MAX_HISTORY_POINTS = 288; // 24h de dados (a cada 5 min)

export interface ExchangeRatePoint {
  rate: number;
  timestamp: string;
  changePct: number | null;
  source: string;
}

export const useExchangeRatePolling = () => {
  const { getToken, isSignedIn } = useAuth();
  const { updateExchangeRate } = useStore();
  const [history, setHistory] = useState<ExchangeRatePoint[]>([]);
  const [isPolling, setIsPolling] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  const fetchRate = useCallback(async () => {
    if (!isSignedIn) return;
    try {
      const token = await getToken({ template: 'supabase' });
      if (!token) return;

      const rates = await getExchangeRates(token);
      if (!rates || !rates.EUR || rates.EUR <= 0) return;

      // Atualiza o store global
      updateExchangeRate(rates.EUR, {
        source: rates.source || 'awesomeapi',
        updatedAt: rates.updatedAt,
        changePct: rates.changes.EUR ?? undefined,
      });

      // Adiciona ponto ao historico local
      if (mountedRef.current) {
        const point: ExchangeRatePoint = {
          rate: rates.EUR,
          timestamp: rates.updatedAt || new Date().toISOString(),
          changePct: rates.changes.EUR ?? null,
          source: rates.source || 'awesomeapi',
        };
        setHistory(prev => {
          // Evita duplicatas no mesmo minuto
          const last = prev[prev.length - 1];
          if (last) {
            const lastTime = new Date(last.timestamp).getTime();
            const newTime = new Date(point.timestamp).getTime();
            if (Math.abs(newTime - lastTime) < 60_000) {
              // Substitui o ultimo ponto se muito proximo
              return [...prev.slice(0, -1), point];
            }
          }
          const next = [...prev, point];
          return next.length > MAX_HISTORY_POINTS
            ? next.slice(-MAX_HISTORY_POINTS)
            : next;
        });
      }
    } catch {
      // Silencioso — o proximo polling tentara novamente
    }
  }, [isSignedIn, getToken, updateExchangeRate]);

  useEffect(() => {
    mountedRef.current = true;

    if (isSignedIn) {
      setIsPolling(true);
      // Primeira busca imediata
      fetchRate();
      // Polling a cada 5 minutos
      intervalRef.current = setInterval(fetchRate, POLL_INTERVAL_MS);
    }

    return () => {
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setIsPolling(false);
    };
  }, [isSignedIn, fetchRate]);

  return { history, isPolling, refetch: fetchRate };
};
