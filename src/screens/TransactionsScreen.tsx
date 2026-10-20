import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useWallet } from '../state/WalletProvider';
import { filteredTransactions, reviewReasons } from '../domain/ledger';
import { localDate } from '../domain/money';
import { Transaction } from '../domain/model';
import { AppNavigation, TabParams } from '../navigation/types';
import { Button, Empty, Field, Label, MonthPicker, Select, Title, styles } from '../ui/components';
import { useTheme } from '../ui/theme';
import { TransactionRow } from '../ui/TransactionRow';
export function TransactionsScreen({ route }: BottomTabScreenProps<TabParams, 'Transações'>) {
  const { state } = useWallet(), t = useTheme(), navigation = useNavigation<AppNavigation>();
  const [month, setMonth] = useState(localDate().slice(0, 7)), [currency, setCurrency] = useState('BRL');
  const [cardId, setCardId] = useState(''), [categoryId, setCategoryId] = useState('');
  const [review, setReview] = useState(false), [search, setSearch] = useState('');
  useEffect(() => { if (route.params?.review !== undefined) setReview(route.params.review); if (route.params?.cardId !== undefined) setCardId(route.params.cardId); }, [route.params]);
  const items = filteredTransactions(state, { month, currency, cardId, categoryId, review, search });
  const onPress = useCallback((id: string) => navigation.navigate('Transaction', { id }), [navigation]);
  const renderItem = useCallback(({ item }: { item: Transaction }) => <TransactionRow transaction={item}
    card={state.cards.find(c => c.id === item.cardId)} category={state.categories.find(c => c.id === item.categoryId)} onPress={onPress} />, [state.cards, state.categories, onPress]);
  const currencies = [...new Set(['BRL', ...state.transactions.flatMap(x => x.currency ? [x.currency] : [])])];
  return <View style={[styles.flex, { backgroundColor: t.bg }]}>
    <FlatList data={items} renderItem={renderItem} keyExtractor={item => item.id} contentContainerStyle={s.content}
      keyboardShouldPersistTaps="handled" initialNumToRender={12} windowSize={7}
      ListHeaderComponent={<View style={s.header}><View><Label muted style={styles.small}>CADA COMPRA, NO SEU LUGAR</Label><Title>Transações</Title></View>
        <MonthPicker month={month} onChange={setMonth} />
        <Field label="Buscar" placeholder="Estabelecimento ou observação" value={search} onChangeText={setSearch} />
        <View style={styles.row}><Select compact label="Moeda" value={currency} onChange={setCurrency} options={currencies.map(c => ({ value: c, label: c }))} />
          <Select compact label="Cartão" value={cardId} onChange={setCardId} options={[{ value: '', label: 'Todos os cartões' }, ...state.cards.map(c => ({ value: c.id, label: c.name }))]} /></View>
        <Select label="Categoria" value={categoryId} onChange={setCategoryId} options={[{ value: '', label: 'Todas as categorias' }, ...state.categories.map(c => ({ value: c.id, label: c.name }))]} />
        <View style={[s.segment, { backgroundColor: t.soft }]}>{[false, true].map(value => <Pressable key={String(value)} accessibilityRole="button" accessibilityState={{ selected: review === value }}
          onPress={() => setReview(value)} style={[s.segmentButton, review === value && { backgroundColor: t.surface }]}>
          <Label style={styles.fieldLabel}>{value ? 'Para revisar' : 'Todas'}</Label></Pressable>)}</View>
        <Button title="Adicionar despesa" icon="add" onPress={() => navigation.navigate('Transaction')} />
        <Label muted style={styles.small}>{items.length} registros neste filtro · {items.filter(x => reviewReasons(x).length > 0).length} para revisar{review ? ' · inclui moeda ausente' : ''}</Label>
      </View>}
      ListEmptyComponent={<Empty icon="receipt-outline" title="Nenhuma transação por aqui" description="Experimente outro mês ou filtro, ou registre uma nova despesa." />}
    />
  </View>;
}
const s = StyleSheet.create({
  content: { padding: 22, paddingBottom: 35 }, header: { gap: 17, paddingBottom: 8 },
  segment: { flexDirection: 'row', padding: 4, borderRadius: 14, gap: 4 }, segmentButton: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 11 },
});
