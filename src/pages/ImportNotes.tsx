import React, { useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useStore } from '../store/useStore';
import { getPlanLimits } from '../services/billing';
import { parseBrokerageNote, parseCsvTransactions, ExtractedTransaction, CsvProvider } from '../services/pdfParser';
import { applyTickerAlias } from '../lib/utils';
import { saveTransaction } from '../services/database';
import { Upload, FileText, Check, AlertCircle, Loader2 } from 'lucide-react';
import { formatCurrency } from '../lib/utils';

const ImportNotes: React.FC = () => {
  const { getToken } = useAuth();
  const { settings, portfolio, transactions: storeTx, addTransaction, addNotification } = useStore();
  
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [transactions, setTransactions] = useState<ExtractedTransaction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState(0);
  const [provider, setProvider] = useState<CsvProvider>('generic');

  const toggleTransaction = (idx: number) => {
    setTransactions(prev => prev.map((tx, i) => 
      i === idx ? { ...tx, _valid: tx._valid === false ? true : false } : tx
    ));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    processFiles(files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      processFiles(files);
    }
  };

  const processFiles = async (files: File[]) => {
    setIsParsing(true);
    setError(null);
    setSuccessCount(0);
    const allTransactions: ExtractedTransaction[] = [];

    for (const file of files) {
      const name = file.name.toLowerCase();
      const isPdf = name.endsWith('.pdf');
      const isCsv = name.endsWith('.csv');

      if (!isPdf && !isCsv) {
        setError('Apenas arquivos PDF (notas) ou CSV (extratos) são aceitos.');
        continue;
      }

      try {
        const extracted = isPdf
          ? await parseBrokerageNote(file)
          : await parseCsvTransactions(file, provider);
        allTransactions.push(...extracted);
      } catch (err) {
        console.error(err);
        setError('Erro ao ler um ou mais arquivos. Verifique se o formato é compatível.');
      }
    }

    if (allTransactions.length === 0 && !error) {
        setError('Nenhuma transação encontrada nas notas. Verifique se o formato é compatível (Padrão Sinacor).');
    }

    setTransactions(allTransactions);
    setIsParsing(false);
  };

  const handleConfirmImport = async () => {
    setIsSaving(true);
    try {
      const token = await getToken({ template: 'supabase' });
      if (!token) throw new Error("Autenticação falhou");

      let saved = 0;
      let skipped = 0;
      const limits = getPlanLimits(settings.plan ?? 'free');
      let txCount = storeTx.length;
      const positions = new Set(portfolio.map(p => p.assetId));
      const validTxs = transactions.filter(tx => tx._valid !== false);

      for (const tx of validTxs) {
        // Enforce transaction count limit
        if (limits.transactions !== null && txCount >= limits.transactions) {
          skipped += (transactions.length - (saved + skipped));
          addNotification({
            title: 'Limite de transações atingido',
            message: `Seu plano atual permite até ${limits.transactions} transações. Algumas operações foram ignoradas.`,
            type: 'warning'
          });
          break;
        }

        // Enforce asset count limit only when creating a new position on BUY
        const isNewPosition = tx.type === 'BUY' && !positions.has(tx.ticker);
        if (isNewPosition && limits.assets !== null && positions.size >= limits.assets) {
          skipped++;
          addNotification({
            title: 'Limite de ativos atingido',
            message: `Seu plano permite até ${limits.assets} ativos no portfólio. Operação em ${tx.ticker} ignorada.`,
            type: 'warning'
          });
          continue;
        }

        // 1. Ensure Asset Exists (Auto-Register if needed)
        // Check if asset exists in store or DB
        // Simple heuristic: If not in store, register as 'Outros' or try to guess
        // We will just register basic info if missing
        
        // Save Transaction
        const ticker = applyTickerAlias(tx.ticker);
        await saveTransaction({
            assetId: ticker,
            type: tx.type,
            quantity: tx.quantity,
            price: tx.price,
            date: tx.date,
            fees: tx.fee
        }, token);
        saved++;

        // Reflect locally only after successful save
        const ok = addTransaction({
          assetId: ticker,
          type: tx.type,
          quantity: tx.quantity,
          price: tx.price,
          date: tx.date,
          fees: tx.fee
        });
        if (!ok) {
          // Should not happen given prior checks, but guard anyway
          skipped++;
        } else {
          txCount++;
          if (isNewPosition) positions.add(ticker);
        }
      }
      
      setSuccessCount(saved);
      setTransactions([]); // Clear list
      
      // Trigger global refresh? 
      // Ideally we should reload transactions in store, but user can just go to dashboard.
      if (skipped > 0) {
        alert(`Importação concluída: ${saved} salvas, ${skipped} ignoradas por limite do plano.`);
      } else {
        alert(`Sucesso! ${saved} transações importadas de ${validTxs.length} verificadas.`);
      }
      
    } catch (err) {
      console.error(err);
      const msg = (err as any)?.message || '';
      if (msg.includes('license_expired')) {
        setError('Sua licença expirou ou saiu do período de carência. Algumas transações não foram importadas. Atualize seu plano para continuar.');
      } else if (msg.includes('license_inactive')) {
        setError('Sua licença está inativa. Verifique o status de pagamento ou escolha um novo plano para importar novas operações.');
      } else if (msg.includes('limit_exceeded')) {
        setError('Você atingiu o limite de transações do seu plano atual durante a importação. Considere um upgrade para concluir a carga de todas as notas.');
      } else {
        setError('Erro ao salvar transações no banco de dados.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      {/* Header */}
        <div className="flex flex-col space-y-2">
        <div className="flex items-center gap-2">
           <h1 className="text-2xl font-bold tracking-tight text-white">Importar Operações</h1>
           <span className="bg-gradient-to-r from-emerald-500 to-green-500 text-black text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider">Beta</span>
        </div>
        <p className="text-gray-400 text-sm">
          Arraste seus PDFs de notas de corretagem (Padrão Sinacor) ou arquivos CSV de extratos/exportações de outras plataformas para importar automaticamente.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#0B1C17] border border-white/10 rounded-2xl p-5 space-y-4">
          <h2 className="text-lg font-bold text-white">Conectar Contas (Somente Leitura)</h2>
          <p className="text-gray-400 text-sm">
            Use exportações em CSV/PDF de outras plataformas (Kinvo, TradeMap, Gorila, Real Valor, apps de corretoras)
            para trazer seus dados para o Autoinvest sem precisar compartilhar senhas desses serviços.
          </p>
          <div className="flex flex-wrap gap-2 text-xs">
            {[
              { id: 'b3', label: 'B3 (CSV)' },
              { id: 'kinvo', label: 'Kinvo' },
              { id: 'trademap', label: 'TradeMap' },
              { id: 'gorila', label: 'Gorila' },
              { id: 'realvalor', label: 'Real Valor' },
              { id: 'broker', label: 'Corretoras B3' },
              { id: 'generic', label: 'Outro CSV' },
            ].map(opt => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setProvider(opt.id as CsvProvider)}
                className={`px-2 py-1 rounded-full border text-[11px] ${
                  provider === opt.id
                    ? 'bg-emerald-500 text-black border-emerald-400'
                    : 'bg-white/5 text-gray-300 border-white/10 hover:border-emerald-400/60'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="bg-black/20 border border-white/5 rounded-xl p-3 text-[11px] text-gray-300 space-y-1">
            {provider === 'b3' && (
              <>
                <p className="font-semibold text-white">Como exportar da B3 (CSV):</p>
                <p>1. Acesse o portal da B3 ou o site da sua corretora (XP, Clear, Rico, Nubank).</p>
                <p>2. Vá em extrato de movimentações ou histórico de negociações.</p>
                <p>3. Exporte o arquivo CSV com as colunas: Data, Movimentação, Ticker, Quantidade, Preço, Valor.</p>
                <p>4. Importe o CSV aqui. Vamos interpretar compra/venda automaticamente.</p>
              </>
            )}
            {provider === 'kinvo' && (
              <>
                <p className="font-semibold text-white">Como exportar do Kinvo:</p>
                <p>1. Abra o Kinvo e vá em Relatórios ou Histórico de operações.</p>
                <p>2. Escolha o período desejado e clique em Exportar.</p>
                <p>3. Selecione o formato CSV e salve o arquivo.</p>
                <p>4. Importe o CSV aqui. Vamos interpretar tipo, ticker, quantidade e valor.</p>
              </>
            )}
            {provider === 'trademap' && (
              <>
                <p className="font-semibold text-white">Como exportar do TradeMap:</p>
                <p>1. No aplicativo ou web, acesse sua carteira ou extrato.</p>
                <p>2. Use a opção de Exportar/Download em CSV.</p>
                <p>3. Salve o arquivo no dispositivo e arraste para esta tela.</p>
              </>
            )}
            {provider === 'gorila' && (
              <>
                <p className="font-semibold text-white">Como exportar do Gorila:</p>
                <p>1. Acesse sua carteira no Gorila.</p>
                <p>2. Gere o relatório de operações ou posição em CSV.</p>
                <p>3. Baixe o arquivo e importe aqui.</p>
              </>
            )}
            {provider === 'realvalor' && (
              <>
                <p className="font-semibold text-white">Como exportar do Real Valor:</p>
                <p>1. Abra o Real Valor e vá em carteira/histórico.</p>
                <p>2. Procure a opção de exportar dados em CSV.</p>
                <p>3. Faça o download e importe o arquivo nesta tela.</p>
              </>
            )}
            {provider === 'broker' && (
              <>
                <p className="font-semibold text-white">Como exportar da corretora:</p>
                <p>1. Faça login no home broker ou área logada.</p>
                <p>2. Vá em extrato de negociações ou notas de corretagem.</p>
                <p>3. Use a opção de exportar em CSV (quando disponível).</p>
                <p>4. Em alternativa, baixe as notas em PDF e use a importação de notas.</p>
              </>
            )}
            {provider === 'generic' && (
              <>
                <p className="font-semibold text-white">Como usar outro CSV:</p>
                <p>1. Certifique-se de que o CSV tem colunas como data, tipo, ticker, quantidade, preço e valor.</p>
                <p>2. Se os nomes seguirem esse padrão, o Autoinvest tenta mapear automaticamente.</p>
              </>
            )}
            <p className="text-[10px] text-gray-500 pt-1">
              Primeiro passo do plano Master: centralizar sua gestão aqui usando arquivos. Depois evoluiremos para conexões automáticas via CEI / Open Finance, sempre em modo somente leitura.
            </p>
          </div>
        </div>
      </div>

      {/* Dropzone */}
      {!transactions.length && successCount === 0 && (
        <div 
            className={`border-2 border-dashed rounded-3xl h-64 flex flex-col items-center justify-center transition-all cursor-pointer ${
                isDragging ? 'border-emerald-500 bg-emerald-500/10' : 'border-white/10 bg-[#0B1C17] hover:border-emerald-500/50'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => document.getElementById('fileInput')?.click()}
        >
            <input 
                type="file" 
                id="fileInput" 
                multiple 
                accept=".pdf,.csv" 
                className="hidden" 
                onChange={handleFileSelect}
            />
            
            {isParsing ? (
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
                    <p className="text-white font-medium">Lendo notas...</p>
                </div>
            ) : (
                <>
                    <div className="bg-white/5 p-4 rounded-full mb-4">
                        <Upload className="w-8 h-8 text-emerald-400" />
                    </div>
                    <p className="text-white font-bold text-lg">Clique ou arraste seus arquivos aqui</p>
                    <p className="text-gray-500 text-sm mt-2">Suporta múltiplos arquivos PDF ou CSV</p>
                </>
            )}
        </div>
      )}

      {/* Error Message */}
      {error && (
          <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-center gap-3 text-red-400">
              <AlertCircle className="w-5 h-5" />
              {error}
          </div>
      )}

      {/* Success Message */}
      {successCount > 0 && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-xl flex flex-col items-center text-center gap-4 animate-in zoom-in duration-300">
              <div className="bg-emerald-500 p-3 rounded-full text-black">
                  <Check className="w-8 h-8" />
              </div>
              <div>
                  <h3 className="text-xl font-bold text-white">{successCount} Transações Importadas!</h3>
                  <p className="text-gray-400 text-sm">Seus dados já estão no dashboard.</p>
              </div>
              <button onClick={() => setSuccessCount(0)} className="text-emerald-400 hover:text-emerald-300 text-sm underline">
                  Importar mais notas
              </button>
          </div>
      )}

      {/* Preview Table */}
      {transactions.length > 0 && (
          <div className="space-y-4">
              <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <FileText className="w-5 h-5 text-blue-500"/> Pré-visualização ({transactions.length})
                  </h3>
                  <div className="flex gap-2">
                      <button 
                        onClick={() => setTransactions([])}
                        className="px-4 py-2 text-sm text-gray-400 hover:text-white"
                      >
                          Cancelar
                      </button>
                      <button 
                        onClick={handleConfirmImport}
                        disabled={isSaving}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-6 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50"
                      >
                          {isSaving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Check className="w-4 h-4"/>}
                          Confirmar Importação
                      </button>
                  </div>
              </div>

              <div className="bg-[#0B1C17] border border-white/10 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-sm text-gray-400">
                      <thead className="bg-white/5 text-white uppercase text-xs">
                          <tr>
                              <th className="p-4">Data</th>
                              <th className="p-4">Ativo</th>
                              <th className="p-4">Operação</th>
                              <th className="p-4 text-right">Qtd</th>
                              <th className="p-4 text-right">Preço</th>
                              <th className="p-4 text-right">Total</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                          {transactions.map((tx, idx) => (
                              <tr key={idx} className={`hover:bg-white/5 transition-colors ${tx._valid === false ? 'opacity-40' : ''}`}>
                                  <td className="p-4">
                                    <input 
                                      type="checkbox" 
                                      checked={tx._valid !== false}
                                      onChange={() => toggleTransaction(idx)}
                                      className="w-4 h-4 rounded border-white/20 bg-white/5 text-emerald-500"
                                    />
                                  </td>
                                  <td className="p-4">{new Date(tx.date).toLocaleDateString('pt-BR')}</td>
                                  <td className="p-4 font-bold text-white">{tx.ticker}</td>
                                  <td className="p-4">
                                      <span className={`px-2 py-1 rounded text-[10px] font-bold ${tx.type === 'BUY' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                                          {tx.type === 'BUY' ? 'COMPRA' : 'VENDA'}
                                      </span>
                                  </td>
                                  <td className="p-4 text-right">{tx.quantity}</td>
                                  <td className="p-4 text-right">{formatCurrency(tx.price, 'BRL')}</td>
                                  <td className="p-4 text-right font-mono text-white">{formatCurrency(tx.total, 'BRL')}</td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      )}
    </div>
  );
};

export default ImportNotes;
