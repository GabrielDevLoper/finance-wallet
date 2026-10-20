import { Transaction, WalletState } from './model';
import { moneyInput, parseMoney, validDate } from './money';
import { normalize, saveTransaction, suggestCategory } from './ledger';

export const CSV_HEADERS = ['id', 'data', 'valor', 'moeda', 'estabelecimento', 'cartao', 'categoria', 'tipo', 'confirmado', 'observacoes', 'estorno_de'];
function parseRows(text: string): string[][] {
  const input = text.replace(/^\uFEFF/, '');
  const delimiter = input.split(/\r?\n/, 1)[0]?.includes(';') ? ';' : ',';
  const rows: string[][] = [];
  let row: string[] = [], cell = '', quoted = false;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i]!;
    if (ch === '"') {
      if (quoted && input[i + 1] === '"') { cell += '"'; i++; } else quoted = !quoted;
    } else if (ch === delimiter && !quoted) { row.push(cell); cell = ''; }
    else if ((ch === '\n' || ch === '\r') && !quoted) {
      if (ch === '\r' && input[i + 1] === '\n') i++;
      row.push(cell); if (row.some(Boolean)) rows.push(row);
      row = []; cell = '';
    } else cell += ch;
  }
  if (quoted) throw new Error('CSV com aspas não fechadas.');
  row.push(cell); if (row.some(Boolean)) rows.push(row);
  return rows;
}
export interface ImportResult { state: WalletState; added: number; skipped: number; errors: string[] }
export function importCSV(state: WalletState, text: string, batchId: string): ImportResult {
  const rows = parseRows(text);
  const headers = rows.shift()?.map(h => normalize(h)) ?? [];
  if (!['data', 'valor', 'moeda', 'estabelecimento'].every(h => headers.includes(h))) {
    throw new Error('O CSV precisa das colunas data, valor, moeda e estabelecimento.');
  }
  let next = state, added = 0, skipped = 0;
  const errors: string[] = [];
  rows.forEach((row, index) => {
    const get = (key: string) => row[headers.indexOf(key)]?.trim() ?? '';
    try {
      if (!validDate(get('data'))) throw new Error('data inválida; use AAAA-MM-DD');
      const originalId = get('id');
      const id = originalId || `csv:${batchId}:${index}`;
      const key = `csv:${originalId || `${batchId}:${index}`}`;
      if (next.processedEvents.includes(key) || next.transactions.some(t => t.id === id)) { skipped++; return; }
      const currency = get('moeda').toUpperCase() || null;
      const amountMinor = currency ? parseMoney(get('valor'), currency) : null;
      const rawCard = get('cartao');
      const card = next.cards.find(c => c.id === rawCard || normalize(c.name) === normalize(rawCard) || c.aliases.includes(normalize(rawCard)));
      const merchant = get('estabelecimento');
      const category = next.categories.find(c => c.id === get('categoria') || normalize(c.name) === normalize(get('categoria')));
      const type = get('tipo');
      if (type && !['despesa', 'estorno'].includes(type)) throw new Error('tipo deve ser despesa ou estorno');
      const t: Transaction = {
        id, eventKey: key, date: get('data'), amountMinor, currency, merchant,
        cardId: card?.id ?? null, rawCard, categoryId: category?.id ?? suggestCategory(next, merchant),
        kind: type === 'estorno' ? 'refund' : 'expense', refundOf: get('estorno_de') || null,
        confirmed: get('confirmado') === 'sim' && !!(card && merchant && currency && amountMinor),
        source: 'csv', notes: get('observacoes'), recordedAt: new Date().toISOString(),
      };
      next = saveTransaction(next, t); added++;
    } catch (error) { errors.push(`Linha ${index + 2}: ${error instanceof Error ? error.message : 'registro inválido'}.`); }
  });
  return { state: next, added, skipped, errors };
}
function cell(value: string): string {
  // Spreadsheet formula injection protection. Preserve multiline text via RFC4180 quoting.
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}
export function exportCSV(state: WalletState, transactions = state.transactions): string {
  const sorted = [...transactions].sort((a, b) => Number(!!a.refundOf) - Number(!!b.refundOf));
  return '\uFEFF' + [CSV_HEADERS.join(';'), ...sorted.map(t => [
    t.id, t.date, t.currency ? moneyInput(t.amountMinor, t.currency) : '', t.currency ?? '', t.merchant,
    state.cards.find(c => c.id === t.cardId)?.name ?? t.rawCard,
    state.categories.find(c => c.id === t.categoryId)?.name ?? '',
    t.kind === 'refund' ? 'estorno' : 'despesa', t.confirmed ? 'sim' : 'nao', t.notes, t.refundOf ?? '',
  ].map(cell).join(';'))].join('\r\n');
}
