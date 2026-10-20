export type Currency = string;
export type Source = 'manual' | 'shortcut' | 'csv' | 'demo';
export interface Card {
  id: string;
  name: string;
  bank: string;
  brand: string;
  last4: string;
  color: string;
  aliases: string[];
}
export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}
export interface Transaction {
  id: string;
  eventKey: string | null;
  amountMinor: number | null;
  currency: Currency | null;
  date: string;
  merchant: string;
  categoryId: string;
  cardId: string | null;
  rawCard: string;
  notes: string;
  source: Source;
  kind: 'expense' | 'refund';
  refundOf: string | null;
  confirmed: boolean;
  recordedAt: string;
}
export interface Budget {
  categoryId: string | null;
  currency: Currency;
  amountMinor: number;
}
export interface WalletState {
  version: 1;
  transactions: Transaction[];
  cards: Card[];
  categories: Category[];
  rules: Record<string, string>;
  processedEvents: string[];
  budgets: Budget[];
  settings: {
    theme: 'system' | 'light' | 'dark';
    lock: boolean;
    budgetAlerts: boolean;
    onboarded: boolean;
  };
  integration: { lastReceived: string | null; userVerifiedAt: string | null };
}
export const palette = ['#31594B', '#5758BB', '#BD6741', '#1C6C8C', '#A44A67', '#6A7250'];
export const defaultCategories: Category[] = [
  { id: 'food', name: 'Alimentação', icon: 'restaurant-outline', color: '#BF704A' },
  { id: 'market', name: 'Supermercado', icon: 'basket-outline', color: '#65815C' },
  { id: 'transport', name: 'Transporte', icon: 'car-outline', color: '#617BB8' },
  { id: 'home', name: 'Moradia', icon: 'home-outline', color: '#9B7BB0' },
  { id: 'health', name: 'Saúde', icon: 'heart-outline', color: '#B6687D' },
  { id: 'leisure', name: 'Lazer', icon: 'ticket-outline', color: '#C39542' },
  { id: 'shopping', name: 'Compras', icon: 'bag-outline', color: '#549296' },
  { id: 'education', name: 'Educação', icon: 'book-outline', color: '#767BC1' },
  { id: 'subscriptions', name: 'Assinaturas', icon: 'repeat-outline', color: '#8B816A' },
  { id: 'other', name: 'Outros', icon: 'grid-outline', color: '#85918B' },
];
export function emptyWallet(): WalletState {
  return {
    version: 1, transactions: [], cards: [], categories: defaultCategories.map(c => ({ ...c })),
    rules: {}, processedEvents: [], budgets: [],
    settings: { theme: 'system', lock: false, budgetAlerts: true, onboarded: false },
    integration: { lastReceived: null, userVerifiedAt: null },
  };
}
