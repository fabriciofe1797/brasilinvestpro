/**
 * useDashboardWidgets — Hook para painel personalizavel
 * 
 * Permite que o usuario escolha quais widgets ver no Dashboard.
 * Salva preferencias no Supabase via set_user_data.
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';

export interface WidgetConfig {
  id: string;
  labelKey: string;
  defaultEnabled: boolean;
}

export const AVAILABLE_WIDGETS: WidgetConfig[] = [
  { id: 'resumo_carteira', labelKey: 'widgetsGen.resumo', defaultEnabled: true },
  { id: 'numero_magico', labelKey: 'widgetsGen.numeroMagico', defaultEnabled: true },
  { id: 'grafico_eurbrl', labelKey: 'widgetsGen.graficoEurBrl', defaultEnabled: true },
  { id: 'proventos', labelKey: 'widgetsGen.proventos', defaultEnabled: true },
  { id: 'alertas', labelKey: 'widgetsGen.alertas', defaultEnabled: true },
  { id: 'market_overview', labelKey: 'widgetsGen.marketOverview', defaultEnabled: true },
  { id: 'rankings', labelKey: 'widgetsGen.rankings', defaultEnabled: true },
  { id: 'fiis_destaque', labelKey: 'widgetsGen.fiisDestaque', defaultEnabled: false },
];

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const EDGE_FN_URL = `${SUPABASE_URL}/functions/v1/app-proxy`;
const DATA_KEY = 'dashboard_widgets';

export const useDashboardWidgets = () => {
  const [enabledWidgets, setEnabledWidgets] = useState<Record<string, boolean>>({});
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const mountedRef = useRef(true);
  const { getToken } = useAuth();

  // Initialize with defaults
  useEffect(() => {
    const defaults: Record<string, boolean> = {};
    for (const w of AVAILABLE_WIDGETS) {
      defaults[w.id] = w.defaultEnabled;
    }
    setEnabledWidgets(defaults);
  }, []);

  // Load from server
  useEffect(() => {
    mountedRef.current = true;
    const load = async () => {
      if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return;
      try {
        // JWT do Clerk para autenticar no app-proxy
        const token = await getToken({ template: 'supabase' }).catch(() => null);
        if (!token) {
          setIsLoaded(true);
          return;
        }
        const r = await fetch(EDGE_FN_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ action: 'get_user_data', data_keys: [DATA_KEY] }),
        });
        if (!r.ok) return;
        const json = await r.json();
        if (!json?.ok || !mountedRef.current) return;
        const saved = json.data?.[DATA_KEY];
        if (saved && typeof saved === 'object') {
          setEnabledWidgets(prev => ({ ...prev, ...(saved as Record<string, boolean>) }));
        }
        setIsLoaded(true);
      } catch {
        // Use defaults
        setIsLoaded(true);
      }
    };
    load();
    return () => { mountedRef.current = false; };
  }, [getToken]);

  const toggleWidget = useCallback(async (widgetId: string) => {
    setEnabledWidgets(prev => {
      const next = { ...prev, [widgetId]: !prev[widgetId] };
      // Save to server (debounced)
      saveToServer(next);
      return next;
    });
  }, []);

  const saveToServer = async (widgets: Record<string, boolean>) => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || isSaving) return;
    const token = await getToken({ template: 'supabase' }).catch(() => null);
    if (!token) return;
    setIsSaving(true);
    try {
      await fetch(EDGE_FN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: 'set_user_data',
          items: [{ data_key: DATA_KEY, data_value: widgets }],
        }),
      });
    } catch {
      // Silently fail
    } finally {
      setIsSaving(false);
    }
  };

  const isEnabled = useCallback((widgetId: string) => {
    return enabledWidgets[widgetId] ?? AVAILABLE_WIDGETS.find(w => w.id === widgetId)?.defaultEnabled ?? false;
  }, [enabledWidgets]);

  return {
    enabledWidgets,
    toggleWidget,
    isEnabled,
    isLoaded,
    isSaving,
    availableWidgets: AVAILABLE_WIDGETS,
  };
};
