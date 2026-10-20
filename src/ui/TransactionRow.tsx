import React, { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Category, Card, Transaction } from '../domain/model';
import { reviewReasons } from '../domain/ledger';
import { money } from '../domain/money';
import { Icon, Label } from './components';
import { useTheme } from './theme';
interface Props { transaction: Transaction; category?: Category; card?: Card; onPress: (id: string) => void }
export const TransactionRow = memo(function TransactionRow({ transaction: t, category, card, onPress }: Props) {
  const theme = useTheme();
  const pending = reviewReasons(t).length > 0;
  return <Pressable accessibilityRole="button" onPress={() => onPress(t.id)} style={[s.row, { borderBottomColor: theme.border }]}>
    <View style={[s.icon, { backgroundColor: `${category?.color ?? '#85918B'}20` }]}><Icon name={category?.icon ?? 'grid-outline'} color={category?.color} size={21} /></View>
    <View style={s.details}><Label numberOfLines={1} style={s.name}>{t.merchant || 'Estabelecimento ausente'}</Label>
      <Label numberOfLines={1} muted style={s.meta}>{card?.name ?? 'Associar cartão'} · {t.date.slice(8)}/{t.date.slice(5, 7)}</Label>
      {pending && <Label style={[s.pending, { color: theme.warning }]}>Revisar registro</Label>}
    </View>
    <View style={s.amount}><Label style={[s.value, t.kind === 'refund' && { color: theme.primary }]}>
      {t.amountMinor === null || !t.currency ? '—' : `${t.kind === 'refund' ? '− ' : ''}${money(t.amountMinor, t.currency)}`}</Label>
      <Label muted style={s.meta}>{t.kind === 'refund' ? 'Estorno' : category?.name}</Label>
    </View>
  </Pressable>;
});
const s = StyleSheet.create({
  row: { paddingVertical: 15, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  icon: { width: 43, height: 43, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  details: { flex: 1 }, name: { fontSize: 14, fontWeight: '600' }, meta: { fontSize: 11, lineHeight: 18 },
  amount: { alignItems: 'flex-end', maxWidth: '42%' }, value: { fontSize: 14, fontWeight: '600' }, pending: { fontSize: 11, lineHeight: 16 },
});
