import { Card, Transaction, WalletState } from './model';
import { currencyDigits, localDate, parseMoney, validDate } from './money';

export const normalize = (text: string) => text.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export function suggestCategory(state: WalletState, merchant: string): string {
  const name = normalize(merchant);
  if (Object.hasOwn(state.rules, name)) return state.rules[name]!;
  if (/restaurante|padaria|cafe|ifood|pizzaria/.test(name)) return 'food';
  if (/mercado|supermercado|hortifruti/.test(name)) return 'market';
  if (/uber|99app|posto|metro|estacionamento/.test(name)) return 'transport';
  if (/farmacia|drogaria|clinica/.test(name)) return 'health';
  if (/netflix|spotify|icloud/.test(name)) return 'subscriptions';
  return 'other';
}
export function reviewReasons(t: Transaction): string[] {
  const issues: string[] = [];
  if (t.amountMinor === null) issues.push('valor ausente');
  if (!t.currency) issues.push('moeda ausente');
  if (!t.cardId) issues.push('cartão não associado');
  if (!t.merchant.trim()) issues.push('estabelecimento ausente');
  if (!t.confirmed) issues.push('aguarda sua confirmação');
  return issues;
}
export function signedAmount(t: Transaction): number {
  return (t.amountMinor ?? 0) * (t.kind === 'refund' ? -1 : 1);
}
export interface Filter { month: string; currency: string; cardId?: string; categoryId?: string; review?: boolean; search?: string }
export function filteredTransactions(state: WalletState, filter: Filter): Transaction[] {
  return state.transactions.filter(t =>
    t.date.startsWith(filter.month) &&
    (t.currency === filter.currency || (filter.review && !t.currency)) &&
    (!filter.cardId || t.cardId === filter.cardId) &&
    (!filter.categoryId || t.categoryId === filter.categoryId) &&
    (!filter.review || reviewReasons(t).length > 0) &&
    (!filter.search || normalize(`${t.merchant} ${t.notes}`).includes(normalize(filter.search)))
  ).sort((a, b) => b.date.localeCompare(a.date) || b.recordedAt.localeCompare(a.recordedAt));
}
export function report(state: WalletState, filter: Filter) {
  const all = filteredTransactions(state, filter);
  const confirmed = all.filter(t => reviewReasons(t).length === 0);
  const total = confirmed.reduce((sum, t) => sum + signedAmount(t), 0);
  const byCategory = state.categories.map(category => ({
    ...category, total: confirmed.filter(t => t.categoryId === category.id).reduce((s, t) => s + signedAmount(t), 0),
  })).filter(c => c.total !== 0).sort((a, b) => b.total - a.total);
  const byCard = state.cards.map(card => ({
    ...card, total: confirmed.filter(t => t.cardId === card.id).reduce((s, t) => s + signedAmount(t), 0),
  }));
  const days = new Date(Number(filter.month.slice(0, 4)), Number(filter.month.slice(5, 7)), 0).getDate();
  const daily = Array.from({ length: days }, (_, i) => confirmed.filter(t => Number(t.date.slice(8)) === i + 1)
    .reduce((s, t) => s + signedAmount(t), 0));
  return { total, byCategory, byCard, daily, pending: all.length - confirmed.length, count: confirmed.length };
}
export function saveCard(state: WalletState, card: Card): WalletState {
  if (!card.name.trim()) throw new Error('Dê um nome ao cartão.');
  if (card.last4 && !/^\d{4}$/.test(card.last4)) throw new Error('Informe somente os quatro últimos dígitos.');
  const aliases = [...new Set(card.aliases.map(normalize).filter(Boolean))];
  if (state.cards.some(c => c.id !== card.id && c.aliases.some(a => aliases.includes(normalize(a))))) {
    throw new Error('Esse nome da Carteira já está associado a outro cartão.');
  }
  const updated = { ...card, aliases };
  return {
    ...state,
    cards: [...state.cards.filter(c => c.id !== card.id), updated],
    transactions: state.transactions.map(t => !t.cardId && aliases.includes(normalize(t.rawCard)) ? { ...t, cardId: card.id } : t),
  };
}
export function saveTransaction(state: WalletState, t: Transaction, remember = false): WalletState {
  if (!validDate(t.date)) throw new Error('Data inválida. Use AAAA-MM-DD.');
  if (t.currency) currencyDigits(t.currency);
  if (t.amountMinor !== null && (!Number.isSafeInteger(t.amountMinor) || t.amountMinor <= 0)) throw new Error('Valor inválido.');
  if (t.cardId && !state.cards.some(c => c.id === t.cardId)) throw new Error('Cartão não encontrado.');
  if (!state.categories.some(c => c.id === t.categoryId)) throw new Error('Categoria não encontrada.');
  if (t.confirmed && reviewReasons(t).length > 0) throw new Error('Preencha valor, moeda, estabelecimento e cartão antes de confirmar.');
  if (t.eventKey && state.processedEvents.includes(t.eventKey) && !state.transactions.some(x => x.id === t.id)) return state;
  const next = [...state.transactions.filter(x => x.id !== t.id), t];
  for (const refund of next.filter(x => x.refundOf)) {
    const original = next.find(x => x.id === refund.refundOf);
    if (!original || original.kind !== 'expense' || refund.kind !== 'refund' ||
      original.currency !== refund.currency || original.cardId !== refund.cardId) {
      throw new Error('O estorno deve ter a mesma moeda e cartão da despesa original.');
    }
    const refunded = next.filter(x => x.refundOf === original.id).reduce((s, x) => s + (x.amountMinor ?? 0), 0);
    if (original.amountMinor === null || refunded > original.amountMinor) throw new Error('Os estornos excedem o valor da despesa.');
  }
  return {
    ...state, transactions: next,
    processedEvents: t.eventKey ? [...new Set([...state.processedEvents, t.eventKey])] : state.processedEvents,
    rules: remember && t.merchant.trim() ? { ...state.rules, [normalize(t.merchant)]: t.categoryId } : state.rules,
  };
}
export function deleteTransaction(state: WalletState, id: string): WalletState {
  if (state.transactions.some(t => t.refundOf === id)) throw new Error('Exclua primeiro os estornos vinculados.');
  // Event tombstones survive deletion, so delivery retries cannot resurrect expenses.
  return { ...state, transactions: state.transactions.filter(t => t.id !== id) };
}
export interface WalletEvent {
  id: string;
  amount?: string | null;
  currency?: string | null;
  merchant?: string | null;
  card?: string | null;
  date?: string | null;
  recordedAt: string;
}
export function ingestEvent(state: WalletState, event: WalletEvent): WalletState {
  const key = `shortcut:${event.id}`;
  if (state.processedEvents.includes(key)) return state;
  let currency: string | null = event.currency?.trim().toUpperCase() || null;
  let amountMinor: number | null = null;
  const warnings: string[] = [];
  try { if (currency) currencyDigits(currency); } catch { currency = null; warnings.push('Revise a moeda recebida.'); }
  try { if (currency) amountMinor = parseMoney(event.amount ?? '', currency); } catch { warnings.push('Revise o valor recebido.'); }
  const rawCard = event.card?.trim() ?? '';
  const card = state.cards.find(c => c.aliases.includes(normalize(rawCard)) || c.id === rawCard);
  const date = event.date && validDate(event.date) ? event.date : localDate(new Date(event.recordedAt));
  if (!event.date || !validDate(event.date)) warnings.push('Data de recebimento usada; confira a data da compra.');
  const next = saveTransaction(state, {
    id: key, eventKey: key, amountMinor, currency, date, merchant: event.merchant?.trim() ?? '',
    categoryId: suggestCategory(state, event.merchant ?? ''), cardId: card?.id ?? null, rawCard,
    notes: warnings.join(' '), source: 'shortcut', kind: 'expense', refundOf: null, confirmed: false, recordedAt: event.recordedAt,
  });
  return { ...next, integration: { ...state.integration, lastReceived: event.recordedAt } };
}
export function budgetWarnings(state: WalletState, month: string) {
  if (!state.settings.budgetAlerts) return [];
  return state.budgets.flatMap(b => {
    const total = report(state, { month, currency: b.currency, categoryId: b.categoryId ?? undefined }).total;
    if (total < b.amountMinor * 0.8) return [];
    const name = b.categoryId ? state.categories.find(c => c.id === b.categoryId)?.name ?? 'Categoria' : 'Orçamento geral';
    return [{ ...b, total, name, ratio: total / b.amountMinor }];
  });
}
