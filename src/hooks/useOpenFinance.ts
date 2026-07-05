import { useState, useCallback, useMemo, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import {
  BrokerConnection,
  OpenFinancePosition,
  SyncHistory,
  getSupportedBrokers,
  initiateConnection,
  syncPositions,
  mapBrokerPositionsToTransactions,
  getSyncHistory,
  getInitialConnections,
  saveConnections,
} from '../services/openFinance';

interface UseOpenFinanceResult {
  connections: BrokerConnection[];
  syncing: boolean;
  syncingBroker: string | null;
  lastSync: string | null;
  syncHistory: SyncHistory[];
  allPositions: OpenFinancePosition[];
  connectBroker: (brokerId: string) => Promise<void>;
  disconnectBroker: (connectionId: string) => void;
  syncAll: () => Promise<void>;
  syncBroker: (connectionId: string) => Promise<void>;
  totalPositions: number;
  totalValue: number;
}

export const useOpenFinance = (): UseOpenFinanceResult => {
  const { getToken, isSignedIn } = useAuth();
  const [connections, setConnections] = useState<BrokerConnection[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncingBroker, setSyncingBroker] = useState<string | null>(null);
  const [allPositions, setAllPositions] = useState<OpenFinancePosition[]>([]);
  const [syncHistory] = useState<SyncHistory[]>(() => getSyncHistory());

  // Load connections from Supabase on mount
  useEffect(() => {
    if (!isSignedIn) return;
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken({ template: 'supabase' });
        if (!token) return;
        const conns = await getInitialConnections(token);
        if (!cancelled) setConnections(conns);
      } catch { /* start empty */ }
    })();
    return () => { cancelled = true; };
  }, [isSignedIn, getToken]);

  const persistConnections = useCallback((conns: BrokerConnection[]) => {
    setConnections(conns);
    getToken({ template: 'supabase' }).then(token => {
      if (token) saveConnections(token, conns).catch(() => {});
    }).catch(() => {});
  }, [getToken]);

  const connectBroker = useCallback(async (brokerId: string) => {
    setSyncingBroker(brokerId);
    try {
      const result = await initiateConnection(brokerId);
      if (result.success) {
        const brokers = getSupportedBrokers();
        const broker = brokers.find(b => b.id === brokerId);
        const newConn: BrokerConnection = {
          id: result.connectionId,
          broker: broker?.name || brokerId,
          status: 'connected',
          connectedAt: new Date().toISOString(),
          lastSync: null,
          positionsCount: 0,
        };
        const updated = [...connections, newConn];
        persistConnections(updated);

        setSyncingBroker(result.connectionId);
        const positions = await syncPositions(result.connectionId);
        setAllPositions(prev => {
          const filtered = prev.filter(p => p.broker !== broker?.name);
          return [...filtered, ...positions];
        });

        const final = updated.map(c =>
          c.id === result.connectionId
            ? { ...c, lastSync: new Date().toISOString(), positionsCount: positions.length }
            : c
        );
        persistConnections(final);
      }
    } catch (err) {
      console.error('Connection error:', err);
    } finally {
      setSyncingBroker(null);
    }
  }, [connections, persistConnections]);

  const disconnectBroker = useCallback((connectionId: string) => {
    const conn = connections.find(c => c.id === connectionId);
    const updated = connections.filter(c => c.id !== connectionId);
    persistConnections(updated);
    if (conn) {
      setAllPositions(prev => prev.filter(p => p.broker !== conn.broker));
    }
  }, [connections, persistConnections]);

  const syncBroker = useCallback(async (connectionId: string) => {
    setSyncingBroker(connectionId);
    try {
      const conn = connections.find(c => c.id === connectionId);
      if (!conn) return;

      const positions = await syncPositions(connectionId);
      setAllPositions(prev => {
        const filtered = prev.filter(p => p.broker !== conn.broker);
        return [...filtered, ...positions];
      });

      const updated = connections.map(c =>
        c.id === connectionId
          ? { ...c, lastSync: new Date().toISOString(), positionsCount: positions.length, status: 'connected' as const }
          : c
      );
      persistConnections(updated);
    } catch {
      const updated = connections.map(c =>
        c.id === connectionId ? { ...c, status: 'error' as const } : c
      );
      persistConnections(updated);
    } finally {
      setSyncingBroker(null);
    }
  }, [connections, persistConnections]);

  const syncAll = useCallback(async () => {
    setSyncing(true);
    for (const conn of connections) {
      await syncBroker(conn.id);
    }
    setSyncing(false);
  }, [connections, syncBroker]);

  const totalPositions = allPositions.length;
  const totalValue = useMemo(() => allPositions.reduce((s, p) => s + p.currentValue, 0), [allPositions]);

  const lastSync = useMemo(() => {
    const synced = connections.filter(c => c.lastSync).sort((a, b) => (b.lastSync || '').localeCompare(a.lastSync || ''));
    return synced[0]?.lastSync || null;
  }, [connections]);

  return {
    connections,
    syncing,
    syncingBroker,
    lastSync,
    syncHistory,
    allPositions,
    connectBroker,
    disconnectBroker,
    syncAll,
    syncBroker,
    totalPositions,
    totalValue,
  };
};
