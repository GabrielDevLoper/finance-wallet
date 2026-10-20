import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
export type RootStackParams = {
  Main: undefined;
  Transaction: { id?: string; refundOf?: string } | undefined;
  CardForm: { id?: string } | undefined;
  Categories: undefined;
  Budgets: undefined;
  Integration: undefined;
};
export type AppNavigation = NativeStackNavigationProp<RootStackParams>;
export type TabParams = { Resumo: undefined; Transações: { review?: boolean; cardId?: string } | undefined; Cartões: undefined; Ajustes: undefined };
