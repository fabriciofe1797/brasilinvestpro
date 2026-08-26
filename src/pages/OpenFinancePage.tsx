import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import { useOpenFinance } from '../hooks/useOpenFinance';
import { getSupportedBrokers } from '../services/openFinance';
import { formatCurrency } from '../lib/utils';
import {
  Link2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Shield,
  ChevronDown,
  ChevronUp,
  Unlink,
  Wallet,
  BarChart3,
  ArrowRightLeft,
  AlertCircle,
} from 'lucide-react';

const OpenFinancePage: React.FC = () => {
  const {
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
  } = useOpenFinance();
  const { t } = useTranslation();

  const [connectingBroker, setConnectingBroker] = useState<string | null>(null);
  const [showConnectModal, setShowConnectModal] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<'positions' | 'history' | 'security'>('positions');

  const brokers = getSupportedBrokers();
  const formatBRL = (v: number) => formatCurrency(v, 'BRL');

  const isConnected = (brokerId: string) => {
    return connections.some(c => c.id.includes(brokerId));
  };

  const getConnectionForBroker = (brokerId: string) => {
    return connections.find(c => c.id.includes(brokerId));
  };

  const handleConnect = async (brokerId: string) => {
    setConnectingBroker(brokerId);
    setShowConnectModal(null);
    try {
      await connectBroker(brokerId);
    } finally {
      setConnectingBroker(null);
    }
  };

  const formatDate = (d: string | null) => {
    if (!d) return t('openFinance.never');
    return new Date(d).toLocaleDateString(i18n.language, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
      case 'error': return <XCircle className="w-3.5 h-3.5 text-red-400" />;
      case 'partial': return <AlertCircle className="w-3.5 h-3.5 text-amber-400" />;
      default: return <Clock className="w-3.5 h-3.5 text-gray-400" />;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <Link2 className="w-8 h-8 text-emerald-500" />
            {t('openFinance.title')}
          </h1>
          <p className="text-gray-500 text-sm font-medium mt-1">
            {t('openFinance.subtitle')}
          </p>
        </div>
        {connections.length > 0 && (
          <button
            onClick={syncAll}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-all text-xs font-bold disabled:opacity-50"
          >
            {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            {syncing ? t('openFinance.syncing') : t('openFinance.syncAll')}
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#0B1C17] border border-white/5 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Link2 className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[10px] font-bold text-gray-500 uppercase">{t('openFinance.statConnections')}</span>
          </div>
          <p className="text-2xl font-black text-white">{connections.length}</p>
          <p className="text-[10px] text-gray-500">{t('openFinance.activeBrokers')}</p>
        </div>
        <div className="bg-[#0B1C17] border border-white/5 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-[10px] font-bold text-gray-500 uppercase">{t('openFinance.statPositions')}</span>
          </div>
          <p className="text-2xl font-black text-white">{totalPositions}</p>
          <p className="text-[10px] text-gray-500">{t('openFinance.syncedAssets')}</p>
        </div>
        <div className="bg-[#0B1C17] border border-white/5 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-[10px] font-bold text-gray-500 uppercase">{t('openFinance.statTotalValue')}</span>
          </div>
          <p className="text-2xl font-black text-white">{formatBRL(totalValue)}</p>
        </div>
        <div className="bg-[#0B1C17] border border-white/5 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[10px] font-bold text-gray-500 uppercase">{t('openFinance.statLastSync')}</span>
          </div>
          <p className="text-sm font-black text-white">{formatDate(lastSync)}</p>
        </div>
      </div>

      {/* Broker Grid */}
      <div>
        <h2 className="text-lg font-bold text-white mb-4">{t('openFinance.brokersTitle')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {brokers.map(broker => {
            const connected = isConnected(broker.id);
            const conn = getConnectionForBroker(broker.id);
            const isConnecting = connectingBroker === broker.id;
            const isSyncingThis = syncingBroker === conn?.id;

            return (
              <div
                key={broker.id}
                className={`bg-[#0B1C17] border rounded-2xl p-5 transition-all ${
                  connected ? 'border-emerald-500/30' : 'border-white/5 hover:border-white/10'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${broker.color} flex items-center justify-center text-lg`}>
                      {broker.logo}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{broker.name}</p>
                      {connected && conn && (
                        <p className="text-[10px] text-gray-500">
                          {t('openFinance.positionsCount', { count: conn.positionsCount })}
                        </p>
                      )}
                    </div>
                  </div>
                  {connected ? (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-black uppercase">
                      {t('openFinance.connected')}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-gray-500 text-[9px] font-black uppercase">
                      {t('openFinance.disconnected')}
                    </span>
                  )}
                </div>

                {connected && conn ? (
                  <div className="space-y-3">
                    <div className="text-[10px] text-gray-500">
                      <p>{t('openFinance.connectedAt', { date: formatDate(conn.connectedAt) })}</p>
                      <p>{t('openFinance.lastSyncLabel', { date: formatDate(conn.lastSync) })}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => syncBroker(conn.id)}
                        disabled={isSyncingThis}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-all text-[10px] font-bold disabled:opacity-50"
                      >
                        {isSyncingThis ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <RefreshCw className="w-3 h-3" />
                        )}
                        {isSyncingThis ? t('openFinance.syncingBtn') : t('openFinance.syncBtn')}
                      </button>
                      <button
                        onClick={() => disconnectBroker(conn.id)}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all text-[10px] font-bold"
                      >
                        <Unlink className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowConnectModal(broker.id)}
                    disabled={isConnecting}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 transition-all text-xs font-bold disabled:opacity-50"
                  >
                    {isConnecting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Link2 className="w-3.5 h-3.5" />
                    )}
                    {isConnecting ? t('openFinance.connecting') : t('openFinance.connect')}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Connect Modal */}
      {showConnectModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowConnectModal(null)} />
          <div className="relative bg-[#0B1C17] border border-white/10 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">{t('openFinance.modalTitle')}</h3>
            <p className="text-sm text-gray-400 mb-6">
              {t('openFinance.modalDesc')}
            </p>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6">
              <p className="text-[10px] text-gray-500 uppercase font-bold mb-2">{t('openFinance.permsTitle')}</p>
              <ul className="space-y-1.5">
                <li className="flex items-center gap-2 text-xs text-gray-300">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" /> {t('openFinance.perm1')}
                </li>
                <li className="flex items-center gap-2 text-xs text-gray-300">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" /> {t('openFinance.perm2')}
                </li>
                <li className="flex items-center gap-2 text-xs text-gray-300">
                  <XCircle className="w-3 h-3 text-red-400" /> {t('openFinance.perm3')}
                </li>
              </ul>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConnectModal(null)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white transition-all text-xs font-bold"
              >
                {t('openFinance.cancel')}
              </button>
              <button
                onClick={() => handleConnect(showConnectModal)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-500 text-black hover:bg-emerald-400 transition-all text-xs font-bold"
              >
                {t('openFinance.authorize')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Positions */}
      {allPositions.length > 0 && (
        <div className="bg-[#0B1C17] border border-white/5 rounded-2xl overflow-hidden">
          <button
            onClick={() => setExpandedSection(expandedSection === 'positions' ? 'security' : 'positions')}
            className="w-full p-6 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
          >
            <div className="flex items-center gap-3">
              <ArrowRightLeft className="w-5 h-5 text-blue-500" />
              <h3 className="text-lg font-bold text-white">{t('openFinance.positionsTitle')}</h3>
              <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-black border border-blue-500/30">
                {allPositions.length}
              </span>
            </div>
            {expandedSection === 'positions' ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
          </button>

          {expandedSection === 'positions' && (
            <div className="px-6 pb-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="text-left text-[10px] font-bold text-gray-500 uppercase py-3 px-2">{t('openFinance.colTicker')}</th>
                      <th className="text-left text-[10px] font-bold text-gray-500 uppercase py-3 px-2">{t('openFinance.colCompany')}</th>
                      <th className="text-left text-[10px] font-bold text-gray-500 uppercase py-3 px-2">{t('openFinance.colBroker')}</th>
                      <th className="text-right text-[10px] font-bold text-gray-500 uppercase py-3 px-2">{t('openFinance.colQty')}</th>
                      <th className="text-right text-[10px] font-bold text-gray-500 uppercase py-3 px-2">{t('openFinance.colAvg')}</th>
                      <th className="text-right text-[10px] font-bold text-gray-500 uppercase py-3 px-2">{t('openFinance.colCurrentValue')}</th>
                      <th className="text-left text-[10px] font-bold text-gray-500 uppercase py-3 px-2">{t('openFinance.colType')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allPositions.map(p => (
                      <tr key={p.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 px-2 text-xs font-black text-white">{p.ticker}</td>
                        <td className="py-3 px-2 text-xs text-gray-400">{p.company}</td>
                        <td className="py-3 px-2">
                          <span className="text-[10px] font-bold text-gray-500 bg-white/5 px-2 py-0.5 rounded">{p.broker}</span>
                        </td>
                        <td className="py-3 px-2 text-xs text-right font-bold text-white">{p.quantity.toLocaleString()}</td>
                        <td className="py-3 px-2 text-xs text-right text-gray-400">{formatBRL(p.avgPrice)}</td>
                        <td className="py-3 px-2 text-xs text-right font-bold text-white">{formatBRL(p.currentValue)}</td>
                        <td className="py-3 px-2">
                          <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-white/5 text-gray-500">{p.type}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sync History */}
      <div className="bg-[#0B1C17] border border-white/5 rounded-2xl overflow-hidden">
        <button
          onClick={() => setExpandedSection(expandedSection === 'history' ? 'security' : 'history')}
          className="w-full p-6 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
        >
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-purple-500" />
            <h3 className="text-lg font-bold text-white">{t('openFinance.historyTitle')}</h3>
          </div>
          {expandedSection === 'history' ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
        </button>

        {expandedSection === 'history' && (
          <div className="px-6 pb-6 space-y-2">
            {syncHistory.map(h => (
              <div key={h.id} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="flex items-center gap-3">
                  {statusIcon(h.status)}
                  <div>
                    <p className="text-xs font-bold text-white">{h.broker}</p>
                    <p className="text-[10px] text-gray-500">{formatDate(h.date)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-gray-400">
                    {t('openFinance.historyCounts', { positions: h.positionsImported, transactions: h.transactionsImported })}
                  </p>
                  <span className={`text-[9px] font-black uppercase ${
                    h.status === 'success' ? 'text-emerald-400' : h.status === 'error' ? 'text-red-400' : 'text-amber-400'
                  }`}>
                    {h.status === 'success' ? t('openFinance.statusSuccess') : h.status === 'error' ? t('openFinance.statusError') : t('openFinance.statusPartial')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Security Section */}
      <div className="bg-[#0B1C17] border border-white/5 rounded-2xl overflow-hidden">
        <button
          onClick={() => setExpandedSection(expandedSection === 'security' ? 'positions' : 'security')}
          className="w-full p-6 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
        >
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-emerald-500" />
            <h3 className="text-lg font-bold text-white">{t('openFinance.securityTitle')}</h3>
          </div>
          {expandedSection === 'security' ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
        </button>

        {expandedSection === 'security' && (
          <div className="px-6 pb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <Shield className="w-5 h-5 text-emerald-400 mb-2" />
                <p className="text-xs font-bold text-white mb-1">{t('openFinance.sec1Title')}</p>
                <p className="text-[10px] text-gray-500">{t('openFinance.sec1Desc')}</p>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <CheckCircle2 className="w-5 h-5 text-blue-400 mb-2" />
                <p className="text-xs font-bold text-white mb-1">{t('openFinance.sec2Title')}</p>
                <p className="text-[10px] text-gray-500">{t('openFinance.sec2Desc')}</p>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <XCircle className="w-5 h-5 text-purple-400 mb-2" />
                <p className="text-xs font-bold text-white mb-1">{t('openFinance.sec3Title')}</p>
                <p className="text-[10px] text-gray-500">{t('openFinance.sec3Desc')}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OpenFinancePage;
