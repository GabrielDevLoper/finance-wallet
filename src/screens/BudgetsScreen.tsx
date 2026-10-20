import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useWallet } from '../state/WalletProvider';
import { money, parseMoney } from '../domain/money';
import { Button, Field, Icon, Label, Notice, Panel, Screen, SectionTitle, Select, styles } from '../ui/components';
export function BudgetsScreen() {
  const { state, update } = useWallet();
  const [categoryId, setCategoryId] = useState(''), [currency, setCurrency] = useState('BRL'), [amount, setAmount] = useState('');
  const [message, setMessage] = useState(''), [busy, setBusy] = useState(false);
  const save = async () => {
    setMessage(''); setBusy(true);
    try {
      const code = currency.toUpperCase().trim();
      const amountMinor = parseMoney(amount, code);
      if (!amountMinor) throw new Error('Informe o limite mensal.');
      await update(s => ({ ...s, budgets: [...s.budgets.filter(b => !(b.categoryId === (categoryId || null) && b.currency === code)), { categoryId: categoryId || null, currency: code, amountMinor }] }));
      setMessage('Orçamento salvo. Ele se aplica a cada mês, em todos os cartões.'); setAmount('');
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Não foi possível salvar.'); }
    finally { setBusy(false); }
  };
  return <Screen form>
    <Label muted>Defina quanto quer gastar a cada mês. Os avisos aparecem no resumo a partir de 80% do limite.</Label>
    <Select label="Orçamento" value={categoryId} onChange={setCategoryId} options={[{ value: '', label: 'Geral · todas as categorias' }, ...state.categories.map(c => ({ value: c.id, label: c.name }))]} />
    <Field label="Moeda" value={currency} onChangeText={v => setCurrency(v.toUpperCase())} maxLength={3} autoCapitalize="characters" />
    <Field label="Limite mensal" value={amount} onChangeText={setAmount} placeholder="2.000,00" keyboardType="decimal-pad" />
    <Button title="Salvar orçamento" onPress={save} loading={busy} />
    {!!message && <Notice>{message}</Notice>}
    <Panel><SectionTitle>Orçamentos ativos</SectionTitle>{state.budgets.map(b => <View key={`${b.categoryId}-${b.currency}`} style={styles.row}>
      <View style={styles.flex}><Label>{b.categoryId ? state.categories.find(c => c.id === b.categoryId)?.name : 'Orçamento geral'}</Label><Label muted>{money(b.amountMinor, b.currency)} / mês</Label></View>
      <Pressable accessibilityRole="button" accessibilityLabel="Remover orçamento" onPress={() => void update(s => ({ ...s, budgets: s.budgets.filter(x => !(x.categoryId === b.categoryId && x.currency === b.currency)) })).catch(e => setMessage(String(e)))}>
        <Icon name="trash-outline" /></Pressable>
    </View>)}{!state.budgets.length && <Label muted>Nenhum limite definido.</Label>}</Panel>
  </Screen>;
}
