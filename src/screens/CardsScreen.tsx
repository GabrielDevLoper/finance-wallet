import React, { memo, useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Card } from '../domain/model';
import { localDate, money } from '../domain/money';
import { report } from '../domain/ledger';
import { AppNavigation, TabParams } from '../navigation/types';
import { useWallet } from '../state/WalletProvider';
import { Button, Empty, Icon, Label, MonthPicker, Select, styles, Title } from '../ui/components';
import { useTheme } from '../ui/theme';
const CardTile = memo(function CardTile({ card, total, currency, onEdit, onHistory }: {
  card: Card; total: number; currency: string; onEdit: (id: string) => void; onHistory: (id: string) => void;
}) {
  return <View style={s.cardBlock}>
    <Pressable accessibilityRole="button" accessibilityLabel={`Editar cartão ${card.name}`} onPress={() => onEdit(card.id)}>
      <LinearGradient colors={[card.color, '#192F29']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.card}>
        <View style={s.between}><Text style={s.bank}>{card.bank || 'Meu cartão'}</Text><Icon name="card-outline" color="#FFFFFFAA" /></View>
        <View style={s.chip}><View style={s.chipLine} /></View>
        <Text style={s.number}>••••  ••••  ••••  {card.last4 || '••••'}</Text>
        <View style={s.between}><Text style={s.cardName}>{card.name}</Text><Text style={s.brand}>{card.brand || 'Cartão'}</Text></View>
      </LinearGradient>
    </Pressable>
    <View style={s.cardFooter}><View><Label muted style={styles.small}>Gastos confirmados no mês</Label><Label style={s.total}>{money(total, currency)}</Label></View>
      <Pressable accessibilityRole="button" onPress={() => onHistory(card.id)}><Label>Ver histórico →</Label></Pressable></View>
  </View>;
});
export function CardsScreen() {
  const { state } = useWallet(), t = useTheme();
  const navigation = useNavigation<AppNavigation>(), tabs = useNavigation<BottomTabNavigationProp<TabParams>>();
  const [month, setMonth] = useState(localDate().slice(0, 7)), [currency, setCurrency] = useState('BRL');
  const totals = report(state, { month, currency }).byCard;
  const onEdit = useCallback((id: string) => navigation.navigate('CardForm', { id }), [navigation]);
  const onHistory = useCallback((id: string) => tabs.navigate('Transações', { cardId: id, review: false }), [tabs]);
  const renderItem = useCallback(({ item }: { item: Card }) => <CardTile card={item} currency={currency} total={totals.find(c => c.id === item.id)?.total ?? 0}
    onEdit={onEdit} onHistory={onHistory} />, [totals, currency, onEdit, onHistory]);
  const currencies = [...new Set(['BRL', ...state.transactions.flatMap(x => x.currency ? [x.currency] : [])])];
  return <View style={[styles.flex, { backgroundColor: t.bg }]}><FlatList data={state.cards} renderItem={renderItem} keyExtractor={c => c.id} contentContainerStyle={s.content}
    ListHeaderComponent={<View style={s.header}><View><Label muted style={styles.small}>CADA CARTÃO TEM SUA HISTÓRIA</Label><Title>Seus cartões</Title><Label muted>Saiba exatamente qual você usou.</Label></View>
      <MonthPicker month={month} onChange={setMonth} />
      <Select label="Moeda dos totais" value={currency} onChange={setCurrency} options={currencies.map(c => ({ value: c, label: c }))} />
      <Button title="Adicionar cartão" icon="add" onPress={() => navigation.navigate('CardForm')} /></View>}
    ListEmptyComponent={<Empty title="Sua carteira começa aqui" description="Cadastre um apelido para o cartão. Não precisamos do número completo nem da senha." icon="card-outline" />} /></View>;
}
const s = StyleSheet.create({
  content: { padding: 22, paddingBottom: 35 }, header: { gap: 18, paddingBottom: 25 }, cardBlock: { marginBottom: 27 },
  card: { minHeight: 210, padding: 24, borderRadius: 24, gap: 18 }, between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  bank: { color: '#F1F3E6', fontSize: 14, fontWeight: '500' }, cardName: { color: '#FFFFFF', fontSize: 15, fontWeight: '500', flex: 1 },
  brand: { color: '#FFFFFFCC', fontStyle: 'italic', fontSize: 17, fontWeight: '700' }, number: { color: '#E3E8D9', letterSpacing: 3, fontSize: 15 },
  chip: { width: 33, height: 25, borderRadius: 6, borderWidth: 1, borderColor: '#D2D0AD99', backgroundColor: '#BCB88C60', justifyContent: 'center' },
  chipLine: { height: 1, backgroundColor: '#E5DBB480' }, cardFooter: { paddingTop: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  total: { fontSize: 21, fontWeight: '600', marginTop: 4 },
});
