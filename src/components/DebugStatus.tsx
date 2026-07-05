import React, { useEffect, useState } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import { getTransactions } from '../services/database';
import { useStore } from '../store/useStore';

const DebugStatus: React.FC = () => {
  const { getToken } = useAuth();
  const { user } = useUser();
  const { transactions, portfolio, assets } = useStore();
  const [dbCount, setDbCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [autoSyncStatus, setAutoSyncStatus] = useState<'pending' | 'success' | 'failed' | 'idle' | 'auto-fixing'>('pending');
  const [autoFixAttempts, setAutoFixAttempts] = useState(0);

  // Monitor Store changes to infer Auto Sync success
  useEffect(() => {
    if (transactions.length > 0) {
      setAutoSyncStatus('success');
    } else if (dbCount === 0 && !loading) {
      setAutoSyncStatus('idle'); // Or empty DB
    } else if (dbCount && dbCount > 0 && transactions.length === 0 && !loading) {
      // Discrepancy detected!
      if (autoFixAttempts < 2) {
        setAutoSyncStatus('auto-fixing');
        console.warn("🚑 Auto-Fix: Detectada falha no carregamento inicial. Tentando corrigir...");
        // Small delay to allow initial load to finish naturally if it's just slow
        const timer = setTimeout(() => {
            forceSync(true); // Silent mode
            setAutoFixAttempts(prev => prev + 1);
        }, 2000);
        return () => clearTimeout(timer);
      } else {
        setAutoSyncStatus('failed');
      }
    }
  }, [transactions, dbCount, loading, autoFixAttempts]);

  const checkDb = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken({ template: 'supabase' });
      if (!token) {
        setError('No Token');
        return;
      }
      
      const txs = await getTransactions(token);
      setDbCount(txs.length);
      return txs; // Return for sync
    } catch (err: any) {
      console.error('Debug Check Failed:', err);
      setError(err.message || 'Check Failed');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const forceSync = async (silent = false) => {
    const txs = await checkDb();
    if (txs && txs.length > 0) {
      console.log('Force Syncing Store with:', txs);
      useStore.getState().setTransactions(txs);
      useStore.getState().syncTransactions(txs);
      if (!silent) alert(`Sincronizado! ${txs.length} transações carregadas.`);
    } else {
      if (!silent) alert('Nada para sincronizar ou erro ao buscar.');
    }
  };

  useEffect(() => {
    if (user) checkDb();
  }, [user]);

  if (!user) return null;

  return (
    <div className="fixed bottom-0 right-0 bg-black/90 border-t border-l border-emerald-500/30 p-2 text-[10px] font-mono text-emerald-400 z-[100] max-w-md opacity-70 hover:opacity-100 transition-opacity flex flex-col gap-1">
      <div className="flex items-center gap-4 justify-between">
        <div><span className="text-gray-500">DB Records:</span> {loading ? '...' : (error ? <span className="text-red-500">{error}</span> : dbCount)}</div>
        <div className="flex gap-1">
          <button onClick={checkDb} className="bg-emerald-500/20 hover:bg-emerald-500/40 px-2 py-0.5 rounded text-white">Check</button>
          <button onClick={() => forceSync()} className="bg-blue-500/20 hover:bg-blue-500/40 px-2 py-0.5 rounded text-white font-bold">Force Sync</button>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 border-t border-white/10 pt-1 mt-1">
        <div><span className="text-gray-500">Store Txs:</span> {transactions.length}</div>
        <div><span className="text-gray-500">Portfolio:</span> {portfolio.length}</div>
        <div><span className="text-gray-500">Assets:</span> {assets.length}</div>
      </div>
      <div className="text-[9px] text-gray-600 mt-1">
         Auto Sync: <span className={autoSyncStatus === 'success' ? 'text-green-500' : 'text-yellow-500'}>{autoSyncStatus.toUpperCase()}</span>
      </div>
      {portfolio.length === 0 && transactions.length > 0 && (
         <div className="text-yellow-500 animate-pulse">⚠️ Txs loaded but Portfolio empty! Missing Assets?</div>
      )}
    </div>
  );
};

export default DebugStatus;
