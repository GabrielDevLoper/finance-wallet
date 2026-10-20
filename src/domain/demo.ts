import { emptyWallet, WalletState } from './model';
import { localDate, monthOffset } from './money';
export function demoWallet(): WalletState {
  const state = emptyWallet();
  const month = localDate().slice(0, 7);
  state.settings.onboarded = true;
  state.cards = [
    { id: 'demo-1', name: 'Meu dia a dia', bank: 'Banco exemplo', brand: 'Visa', last4: '4829', color: '#31594B', aliases: [] },
    { id: 'demo-2', name: 'Planos & viagens', bank: 'Banco exemplo', brand: 'Mastercard', last4: '9012', color: '#5758BB', aliases: [] },
  ];
  const items: [string, number, string, string, number][] = [
    ['Café do bairro', 2450, 'food', 'demo-1', 19], ['Mercado da esquina', 28690, 'market', 'demo-1', 18],
    ['Restaurante Jardim', 8900, 'food', 'demo-2', 17], ['Uber', 3280, 'transport', 'demo-1', 16],
    ['Livraria', 7900, 'education', 'demo-2', 14], ['Spotify', 2190, 'subscriptions', 'demo-1', 12],
    ['Feira de sábado', 12400, 'market', 'demo-1', 10], ['Cinema', 6800, 'leisure', 'demo-2', 8],
    ['Farmácia', 4560, 'health', 'demo-1', 5], ['Restaurante Jardim', 13500, 'food', 'demo-1', 3],
  ];
  state.transactions = items.map(([merchant, amountMinor, categoryId, cardId, day], i) => ({
    id: `demo-t-${i}`, eventKey: null, amountMinor, currency: 'BRL', date: `${month}-${String(day).padStart(2, '0')}`,
    merchant, categoryId, cardId, rawCard: '', notes: 'Dado demonstrativo', source: 'demo',
    kind: 'expense', refundOf: null, confirmed: true, recordedAt: new Date().toISOString(),
  }));
  state.transactions.push({ ...state.transactions[0]!, id: 'demo-old', amountMinor: 132000, date: `${monthOffset(month, -1)}-10` });
  state.transactions.push({ ...state.transactions[0]!, id: 'demo-review', merchant: 'Compra para revisar', amountMinor: null, confirmed: false });
  state.budgets = [{ categoryId: null, currency: 'BRL', amountMinor: 200000 }];
  return state;
}
