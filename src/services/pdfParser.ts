import * as pdfjsLib from 'pdfjs-dist';

// Configurar Worker (usando CDN para evitar problemas de build com Vite)
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export interface ExtractedTransaction {
  date: string;
  type: 'BUY' | 'SELL';
  ticker: string;
  quantity: number;
  price: number;
  total: number;
  fee: number;
  _valid?: boolean;
}

export const parseBrokerageNote = async (file: File): Promise<ExtractedTransaction[]> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const transactions: ExtractedTransaction[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const textItems = textContent.items.map((item: any) => item.str);
      const fullText = textItems.join(' '); // Join with space for regex matching

      // 1. Extract Date (Padrão: "Data pregão" seguido de dd/mm/aaaa)
      // Regex busca datas no formato dd/mm/aaaa
      const dateMatch = fullText.match(/(\d{2})\/(\d{2})\/(\d{4})/);
      let noteDate = '';
      if (dateMatch) {
          // Convert to ISO YYYY-MM-DD
          noteDate = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;
      }

      // 2. Extract Transactions (Padrão Sinacor)
      // Linhas geralmente são: Q/V Tipo Mercado Prazo Ticker ... Qtd Preço Valor
      // Ex: "C Vista 1-BOVESPA FII HGCR11 10 102,50 1.025,00 D"
      // Regex robusta para capturar a linha de operação
      // Procura por "1-BOVESPA" que é padrão em notas B3
      
      // Vamos iterar sobre os itens de texto originais para preservar a ordem das colunas se possível, 
      // mas `fullText` joined pode perder a quebra de linha. 
      // PDF.js retorna itens linha a linha ou bloco a bloco.
      // Melhor estratégia: Reconstruir linhas baseadas na posição Y (transform), mas é complexo.
      // Estratégia Simples: Regex no texto completo se ele mantiver a ordem horizontal.
      // Muitas vezes o PDF mistura.
      
      // Tentativa: Regex global que pega o padrão "C/V" ... "Ticker" ... "Qtd" ... "Preço"
      // Padrão visual: [C/V] [Mercado] [Prazo] [Ticker] [Obs] [Qtd] [Preço] [Valor] [D/C]
      // Ex: C VISTA 1-BOVESPA HGLG11 10 162,50 1.625,00 D
      
      // Regex:
      // (C|V) \s+ (VISTA|FRACIONARIO) \s+ (?:1-BOVESPA)? \s+ ([A-Z0-9]+[0-9]{1,2}) .*? (\d+(?:\.\d{3})*) \s+ (\d+(?:\.\d{3})*,\d{2})
      
      // Nota: O texto do PDF.js pode vir fragmentado "HGLG" "11".
      // Vamos tentar normalizar espaços.
      
      const normalizedText = textItems.join('  '); // Double space to separate columns clearly
      
      // Regex ajustada para capturar operações
      // Captura: Tipo (C/V), Ticker, Qtd, Preço
      const transactionRegex = /(?:\s|^)(C|V)\s+(?:VISTA|FRACIONARIO|OPCAO|TERMO)\s+(?:1-BOVESPA)?\s*([A-Z0-9]{4,6})\s+.*?\s+(\d+)\s+(\d{1,3}(?:\.\d{3})*,\d{2})\s+(\d{1,3}(?:\.\d{3})*,\d{2})\s+(D|C)/g;
      
      let match;
      while ((match = transactionRegex.exec(normalizedText)) !== null) {
          const typeChar = match[1]; // C or V
          const ticker = match[2];
          const qtdStr = match[3];
          const priceStr = match[4];
          const totalStr = match[5];
          
          const type = typeChar === 'C' ? 'BUY' : 'SELL';
          const quantity = parseInt(qtdStr.replace(/\./g, ''), 10);
          const price = parseFloat(priceStr.replace('.', '').replace(',', '.'));
          const total = parseFloat(totalStr.replace('.', '').replace(',', '.'));
          
          // Basic validation
          if (ticker && quantity > 0 && price > 0) {
              transactions.push({
                  date: noteDate || new Date().toISOString().split('T')[0], // Fallback to today if date not found
                  type,
                  ticker,
                  quantity,
                  price,
                  total,
                  fee: 0 // Taxas são difíceis de ratear por ativo, deixamos 0 por enquanto ou pegamos do total da nota depois
              });
          }
      }
    }

    return transactions;
  } catch (error) {
    console.error("Error parsing PDF:", error);
    throw new Error("Falha ao ler o arquivo PDF. Verifique se é uma nota de corretagem válida.");
  }
};

export type CsvProvider = 'generic' | 'kinvo' | 'trademap' | 'gorila' | 'realvalor' | 'broker' | 'b3';

/**
 * Parser especifico para CSV da B3 (InfoEntrega / Movimentacao)
 * Formato: Data,Movimentacao,Ticker,Quantidade,Preco,Valor
 * Suporta formatos de diferentes corretoras (Clear, Rico, XP, Nubank)
 */
export const parseB3Csv = async (file: File): Promise<ExtractedTransaction[]> => {
  const text = await file.text();
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length < 2) return [];

  const firstLine = lines[0];
  const delimiter = firstLine.includes(';') ? ';' : ',';
  const headerCols = firstLine.toLowerCase().split(delimiter).map(h => h.trim().replace(/"/g, ''));

  // Detectar colunas
  let dateIdx = headerCols.findIndex(h => h.includes('data') || h === 'date');
  let movIdx = headerCols.findIndex(h => h.includes('moviment') || h.includes('tipo') || h.includes('operation') || h.includes('side'));
  let tickerIdx = headerCols.findIndex(h => h.includes('ticker') || h.includes('ativo') || h.includes('symbol') || h.includes('codigo'));
  let qtyIdx = headerCols.findIndex(h => h.includes('quant') || h.includes('qtd') || h.includes('quantity'));
  let priceIdx = headerCols.findIndex(h => h.includes('preco') || h.includes('preço') || h.includes('price'));
  let valueIdx = headerCols.findIndex(h => h.includes('valor') || h.includes('total') || h.includes('value'));
  const feeIdx = headerCols.findIndex(h => h.includes('taxa') || h.includes('fee') || h.includes('corretagem') || h.includes('emol'));

  // Fallback: posicoes padrao do B3
  if (dateIdx === -1) dateIdx = 0;
  if (movIdx === -1) movIdx = 1;
  if (tickerIdx === -1) tickerIdx = 2;
  if (qtyIdx === -1) qtyIdx = 3;
  if (priceIdx === -1) priceIdx = 4;
  if (valueIdx === -1) valueIdx = 5;

  const cleanNumber = (val: string) =>
    Number(String(val).replace(/[R$\s"]/g, '').replace(/\./g, '').replace(',', '.'));

  const result: ExtractedTransaction[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(delimiter).map(c => c.trim().replace(/"/g, ''));
    if (cols.length < 4) continue;

    const rawDate = cols[dateIdx] || '';
    const rawMov = (cols[movIdx] || '').toUpperCase();
    const rawTicker = (cols[tickerIdx] || '').toUpperCase().trim();
    const rawQty = cols[qtyIdx] || '0';
    const rawPrice = cols[priceIdx] || '0';
    const rawValue = valueIdx >= 0 && cols[valueIdx] ? cols[valueIdx] : '';
    const rawFee = feeIdx >= 0 && cols[feeIdx] ? cols[feeIdx] : '0';

    // Mapear movimentacao para BUY/SELL
    let type: 'BUY' | 'SELL' = 'BUY';
    if (
      rawMov.includes('VENDA') ||
      rawMov.includes('SELL') ||
      rawMov === 'V' ||
      rawMov.includes('ALIENACAO') ||
      rawMov.includes('LIQUIDACAO/VENDA')
    ) {
      type = 'SELL';
    } else if (
      rawMov.includes('COMPRA') ||
      rawMov.includes('BUY') ||
      rawMov === 'C' ||
      rawMov.includes('LIQUIDACAO/COMPRA') ||
      rawMov.includes('TRANSFERENCIA')
    ) {
      type = 'BUY';
    } else {
      // Ignorar movimentacoes que nao sao compra/venda (dividendos, etc)
      continue;
    }

    const quantity = cleanNumber(rawQty);
    const price = cleanNumber(rawPrice);
    const total = rawValue ? cleanNumber(rawValue) : quantity * price;
    const fee = rawFee ? cleanNumber(rawFee) : 0;

    // Parse date
    let isoDate = new Date().toISOString().split('T')[0];
    const dm = rawDate.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    const ym = rawDate.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (dm) {
      isoDate = `${dm[3]}-${dm[2]}-${dm[1]}`;
    } else if (ym) {
      isoDate = `${ym[1]}-${ym[2]}-${ym[3]}`;
    }

    if (!rawTicker || !quantity || !price) continue;

    result.push({
      date: isoDate,
      type,
      ticker: rawTicker,
      quantity,
      price,
      total,
      fee,
    });
  }

  return result;
};

export const parseCsvTransactions = async (file: File, provider: CsvProvider = 'generic'): Promise<ExtractedTransaction[]> => {
  // B3 CSV has a specific parser
  if (provider === 'b3') {
    return parseB3Csv(file);
  }

  const text = await file.text();
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  if (!lines.length) return [];

  const firstLine = lines[0];
  const delimiter = firstLine.includes(';') ? ';' : ',';
  const headerCols = firstLine.toLowerCase().split(delimiter).map(h => h.trim());

  let hasHeader = false;
  if (headerCols.some(h => h.includes('ticker') || h.includes('ativo') || h.includes('symbol'))) {
    hasHeader = true;
  }

  let dateIdx = headerCols.findIndex(h => h.startsWith('data'));
  let typeIdx = headerCols.findIndex(h => h.startsWith('tipo') || h.includes('operation') || h.includes('side'));
  let tickerIdx = headerCols.findIndex(h => h.includes('ticker') || h.includes('ativo') || h.includes('symbol'));
  let qtyIdx = headerCols.findIndex(h => h.includes('qtd') || h.includes('quantidade') || h.includes('quantity'));
  let priceIdx = headerCols.findIndex(h => h.includes('preço') || h.includes('preco') || h.includes('price'));
  let totalIdx = headerCols.findIndex(h => h.includes('total') || h.includes('valor'));
  let feeIdx = headerCols.findIndex(h => h.includes('taxa') || h.includes('fee') || h.includes('corretagem'));

  if (!hasHeader) {
    dateIdx = 0;
    typeIdx = 1;
    tickerIdx = 2;
    qtyIdx = 3;
    priceIdx = 4;
    totalIdx = 5;
    feeIdx = 6;
  }

  const startIndex = hasHeader ? 1 : 0;
  const result: ExtractedTransaction[] = [];

  const cleanNumber = (val: string) =>
    Number(String(val).replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.'));

  for (let i = startIndex; i < lines.length; i++) {
    const cols = lines[i].split(delimiter).map(c => c.trim());
    if (cols.length < 4) continue;

    const rawTicker = tickerIdx >= 0 ? cols[tickerIdx] : '';
    const rawQty = qtyIdx >= 0 ? cols[qtyIdx] : '';
    const rawPrice = priceIdx >= 0 ? cols[priceIdx] : '';
    const rawTotal = totalIdx >= 0 ? cols[totalIdx] : '';
    const rawFee = feeIdx >= 0 ? cols[feeIdx] : '0';
    const rawType = typeIdx >= 0 ? cols[typeIdx] : '';
    const rawDate = dateIdx >= 0 ? cols[dateIdx] : '';

    const ticker = rawTicker.toUpperCase();
    const quantity = cleanNumber(rawQty);
    const price = cleanNumber(rawPrice);
    const total = rawTotal ? cleanNumber(rawTotal) : quantity * price;
    const fee = rawFee ? cleanNumber(rawFee) : 0;

    const t = rawType.toUpperCase();
    const type: 'BUY' | 'SELL' =
      t === 'C' ||
      t.includes('COMPRA') ||
      t.includes('BUY')
        ? 'BUY'
        : t === 'V' ||
          t.includes('VENDA') ||
          t.includes('SELL')
        ? 'SELL'
        : 'BUY';

    let isoDate = new Date().toISOString().split('T')[0];
    const dm = rawDate.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    const ym = rawDate.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (dm) {
      isoDate = `${dm[3]}-${dm[2]}-${dm[1]}`;
    } else if (ym) {
      isoDate = `${ym[1]}-${ym[2]}-${ym[3]}`;
    }

    if (!ticker || !quantity || !price) continue;

    result.push({
      date: isoDate,
      type,
      ticker,
      quantity,
      price,
      total,
      fee,
    });
  }

  return result;
};
