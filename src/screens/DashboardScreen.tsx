import React, { useCallback, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import Svg, { Defs, LinearGradient, Stop, Path, Line } from 'react-native-svg';
import { useWallet } from '../state/WalletProvider';
import { budgetWarnings, filteredTransactions, report } from '../domain/ledger';
import { localDate, money, monthOffset } from '../domain/money';
import { AppNavigation, TabParams } from '../navigation/types';
import { Button, Empty, Icon, Label, MonthPicker, Notice, Panel, Screen, SectionTitle, Select, styles, Title } from '../ui/components';
import { TransactionRow } from '../ui/TransactionRow';
import { useTheme } from '../ui/theme';
import { walletBridge } from '../services/walletBridge';

function SpendingChart({ values }: { values: number[] }) {
  const t = useTheme();
  let running = 0;
  const cumulative = values.map(v => running += v);
  const min = Math.min(0, ...cumulative), max = Math.max(1, ...cumulative);
  const points = [0, ...cumulative].map((v, i) => `${i * 320 / values.length},${95 - (v - min) / (max - min) * 80}`);
  const path = `M ${points.join(' L ')}`;
  return <View accessible accessibilityLabel="Evolução acumulada dos gastos confirmados no mês">
    <Svg width="100%" height={118} viewBox="0 0 320 118">
      <Defs><LinearGradient id="chart" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor={t.primary} stopOpacity=".2" /><Stop offset="1" stopColor={t.primary} stopOpacity="0" /></LinearGradient></Defs>
      <Line x1="0" x2="320" y1="95" y2="95" stroke={t.border} strokeDasharray="4 5" />
      <Path d={`${path} L 320,110 L 0,110 Z`} fill="url(#chart)" />
      <Path d={path} stroke={t.primary} strokeWidth="2.5" fill="none" strokeLinejoin="round" />
    </Svg><View style={s.chartAxis}><Label muted style={styles.small}>Dia 1</Label><Label muted style={styles.small}>Dia {values.length}</Label></View>
  </View>;
}
export function DashboardScreen() {
  const { state, demo } = useWallet();
  const t = useTheme(), navigation = useNavigation<AppNavigation>();
  const tabs = useNavigation<BottomTabNavigationProp<TabParams>>();
  const [month, setMonth] = useState(localDate().slice(0, 7)), [currency, setCurrency] = useState('BRL');
  const [cardId, setCardId] = useState(''), [categoryId, setCategoryId] = useState('');
  const filter = { month, currency, cardId, categoryId };
  const current = report(state, filter), previous = report(state, { ...filter, month: monthOffset(month, -1) });
  const change = previous.total > 0 ? (current.total - previous.total) / previous.total * 100 : null;
  const recent = filteredTransactions(state, filter).slice(0, 4);
  const reviewCount = state.transactions.filter(x => !x.confirmed || !x.cardId || !x.currency || !x.amountMinor || !x.merchant).length;
  const currencies = [...new Set(['BRL', ...state.transactions.flatMap(x => x.currency ? [x.currency] : [])])];
  const budget = state.budgets.find(b => b.currency === currency && b.categoryId === (categoryId || null));
  const budgetTotal = report(state, { month, currency, categoryId }).total;
  const onTransaction = useCallback((id: string) => navigation.navigate('Transaction', { id }), [navigation]);
  return <Screen>
    <View style={s.heading}>
      <View><Label muted style={s.eyebrow}>SEU DINHEIRO, MAIS CLARO</Label><Title>Minha Carteira</Title></View>
      <Pressable accessibilityRole="button" accessibilityLabel="Configurar Carteira Apple" onPress={() => navigation.navigate('Integration')}
        style={[s.avatar, { backgroundColor: t.soft }]}><Icon name="wallet-outline" color={t.primary} /></Pressable>
    </View>
    {demo && <Notice>Modo demonstração · Dados fictícios. Alterações nesta prévia são temporárias.</Notice>}
    <MonthPicker month={month} onChange={setMonth} />
    <View style={[s.hero, { backgroundColor: t.hero }]}>
      <View style={styles.row}><View style={styles.flex}><Text style={s.heroLabel}>Total gasto no mês</Text></View>
        <Text style={s.heroTag}>{currency}</Text><Icon name="arrow-up-right" color="#D6E5D8" size={21} /></View>
      <Text adjustsFontSizeToFit numberOfLines={1} style={s.heroValue}>{money(current.total, currency)}</Text>
      <View style={s.comparison}><Icon name={change === null || change <= 0 ? 'trending-down' : 'trending-up'} color="#D8E8B3" size={18} />
        <Text style={s.comparisonText}>{change === null ? 'Seu mês em um só lugar' : `${Math.abs(change).toFixed(1).replace('.', ',')}% ${change <= 0 ? 'menos' : 'mais'} que no mês anterior`}</Text></View>
      <View style={s.heroDivider} /><View style={styles.row}><Icon name="checkmark-circle-outline" size={16} color="#C4D6C8" /><Text style={s.heroFoot}>Somente gastos completos e confirmados</Text></View>
    </View>
    <View style={styles.row}>
      <Select compact label="Moeda" value={currency} onChange={setCurrency} options={currencies.map(c => ({ value: c, label: c }))} />
      <Select compact label="Cartão" value={cardId} onChange={setCardId} options={[{ value: '', label: 'Todos os cartões' }, ...state.cards.map(c => ({ value: c.id, label: c.name }))]} />
    </View>
    <Select compact label="Categoria" value={categoryId} onChange={setCategoryId} options={[{ value: '', label: 'Todas as categorias' }, ...state.categories.map(c => ({ value: c.id, label: c.name }))]} />
    <Button title="Adicionar despesa" icon="add" onPress={() => navigation.navigate('Transaction')} />
    {!!reviewCount && <Pressable accessibilityRole="button" onPress={() => tabs.navigate('Transações', { review: true })}>
      <Notice>{reviewCount} {reviewCount === 1 ? 'registro precisa' : 'registros precisam'} da sua revisão. Toque para conferir por mês.</Notice>
    </Pressable>}
    {budgetWarnings(state, month).map(b => <Notice key={`${b.categoryId}-${b.currency}`}>{b.name}: {Math.round(b.ratio * 100)}% utilizado em {b.currency}.</Notice>)}
    <Panel>
      <SectionTitle action="Definir" onPress={() => navigation.navigate('Budgets')}>Seu orçamento</SectionTitle>
      {budget ? <>
        <View style={s.budgetLabels}><Label style={s.budgetValue}>{money(budgetTotal, currency)}</Label><Label muted style={styles.small}>de {money(budget.amountMinor, currency)}</Label></View>
        <View style={[s.track, { backgroundColor: t.soft }]}><View style={[s.progress, { backgroundColor: t.primary, width: `${Math.max(0, Math.min(100, budgetTotal / budget.amountMinor * 100))}%` }]} /></View>
        <Label muted style={styles.small}>{money(Math.max(0, budget.amountMinor - budgetTotal), currency)} disponíveis · todos os cartões</Label>
      </> : <Label muted>Defina um limite mensal e acompanhe seus gastos com tranquilidade.</Label>}
    </Panel>
    <Panel><SectionTitle>Evolução do mês</SectionTitle><Label muted style={styles.small}>Acumulado · {currency} · {current.count} registros confirmados</Label><SpendingChart values={current.daily} /></Panel>
    <View style={s.section}>
      <SectionTitle>Para onde foi seu dinheiro</SectionTitle>
      <Panel>{current.byCategory.length ? current.byCategory.map(c => <View key={c.id} style={s.category}>
        <View style={[s.categoryIcon, { backgroundColor: `${c.color}20` }]}><Icon name={c.icon} color={c.color} size={19} /></View>
        <View style={styles.flex}><View style={s.budgetLabels}><Label style={s.categoryName}>{c.name}</Label><Label style={s.categoryName}>{money(c.total, currency)}</Label></View>
          <View style={[s.miniTrack, { backgroundColor: t.soft }]}><View style={[s.progress, { backgroundColor: c.color, width: `${Math.max(0, Math.min(100, c.total / Math.max(1, current.total) * 100))}%` }]} /></View></View>
      </View>) : <Empty title="Um novo começo" description="Seus gastos aparecerão aqui depois do primeiro registro confirmado." icon="pie-chart-outline" />}</Panel>
    </View>
    {!!state.cards.length && <Panel><SectionTitle>Gastos por cartão</SectionTitle>{current.byCard.map(c =>
      <View key={c.id} style={styles.row}><View style={[s.dot, { backgroundColor: c.color }]} /><Label style={styles.flex}>{c.name}</Label><Label style={s.categoryName}>{money(c.total, currency)}</Label></View>
    )}</Panel>}
    <View style={s.section}><SectionTitle action="Ver todas" onPress={() => tabs.navigate('Transações')}>Últimas transações</SectionTitle>
      <Panel style={s.transactions}>{recent.length ? recent.map(transaction => <TransactionRow key={transaction.id} transaction={transaction}
        category={state.categories.find(c => c.id === transaction.categoryId)} card={state.cards.find(c => c.id === transaction.cardId)} onPress={onTransaction} />) :
        <Empty title="Tudo pronto para começar" description="Adicione uma despesa ou configure o recebimento pelo Atalhos." />}</Panel></View>
    <Pressable onPress={() => navigation.navigate('Integration')} accessibilityRole="button" style={s.integration}>
      <Icon name="link-outline" color={t.muted} size={17} /><Label muted style={styles.small}>{demo ? 'Explore como conectar ao Atalhos' : walletBridge ? 'Atalhos disponível · configurar e testar' : 'Integração Apple indisponível nesta versão'}</Label>
    </Pressable>
  </Screen>;
}
const s = StyleSheet.create({
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  eyebrow: { fontSize: 9, letterSpacing: 1.7, fontWeight: '600', marginBottom: 5 },
  avatar: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  hero: { borderRadius: 28, padding: 25, overflow: 'hidden', gap: 12 },
  heroLabel: { color: '#D4E0D6', fontSize: 14 }, heroTag: { color: '#DFE8DA', fontSize: 11, letterSpacing: 1 },
  heroValue: { color: '#F4F7E9', fontSize: 47, lineHeight: 58, letterSpacing: -1.7, fontFamily: Platform.OS === 'android' ? 'serif' : 'Georgia' },
  comparison: { flexDirection: 'row', gap: 8, alignItems: 'center' }, comparisonText: { color: '#D8E8B3', fontSize: 12 },
  heroDivider: { height: 1, backgroundColor: '#FFFFFF20', marginTop: 6 }, heroFoot: { color: '#C4D6C8', fontSize: 10 },
  budgetLabels: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, alignItems: 'center' },
  budgetValue: { fontSize: 20, fontWeight: '600' }, track: { height: 8, borderRadius: 8, overflow: 'hidden' },
  progress: { height: '100%', borderRadius: 8 }, miniTrack: { height: 5, borderRadius: 5, marginTop: 8, overflow: 'hidden' },
  chartAxis: { flexDirection: 'row', justifyContent: 'space-between' }, category: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
  categoryIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  categoryName: { fontSize: 13, fontWeight: '500' }, section: { gap: 15 }, transactions: { paddingVertical: 5, gap: 0 },
  dot: { width: 8, height: 8, borderRadius: 4 }, integration: { flexDirection: 'row', gap: 8, justifyContent: 'center', paddingVertical: 4 },
});
