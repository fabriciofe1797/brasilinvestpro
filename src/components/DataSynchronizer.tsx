import React, { useRef } from 'react';
import { useStore } from '../store/useStore';
import { useDataSync } from '../hooks/useDataSync';
import { useAuth } from '@clerk/clerk-react';

const DataSynchronizer: React.FC = () => {
  const { settings } = useStore();
  const { sync, isSyncing, hasSynced } = useDataSync();
  const { isSignedIn } = useAuth();
  const wasSyncingRef = useRef(false);
  const retryCountRef = useRef(0);
  const MAX_RETRIES = 3;

  // Theme Effect
  React.useEffect(() => {
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.theme]);

  // Initial Sync on Load
  React.useEffect(() => {
    if (isSignedIn) {
      retryCountRef.current = 0;
      const timer = setTimeout(() => sync(), 1000);
      return () => clearTimeout(timer);
    }
  }, [isSignedIn, sync]);

  // Retry sync if previous attempt finished but may have failed
  // (só re-tenta enquanto o sync ainda não tiver sido concluído com sucesso)
  React.useEffect(() => {
    if (wasSyncingRef.current && !isSyncing && isSignedIn && !hasSynced && retryCountRef.current < MAX_RETRIES) {
      retryCountRef.current += 1;
      const delay = retryCountRef.current * 3000; // 3s, 6s, 9s
      const timer = setTimeout(() => sync(), delay);
      return () => clearTimeout(timer);
    }
    wasSyncingRef.current = isSyncing;
  }, [isSyncing, isSignedIn, hasSynced, sync]);

  return null;
};

export default DataSynchronizer;
