import React, { useState } from 'react';
import { View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Crypto from 'expo-crypto';
import { RootStackParams } from '../navigation/types';
import { useWallet } from '../state/WalletProvider';
import { deleteTransaction, reviewReasons, saveTransaction, suggestCategory } from '../domain/ledger';
import { localDate, moneyInput, parseMoney } from '../domain/money';
import { Transaction } from '../domain/model';
import { Button, Field, Label, Notice, Screen, Select, ToggleRow, styles } from '../ui/components';
export function TransactionFormScreen({ route, navigation }: NativeStackScreenProps<RootStackParams, 'Transaction'>) {
  const { state, update } = useWallet();
  const existing = state.transactions.find(t => t.id === route.params?.id);
  const original = state.transactions.find(t => t.id === route.params?.refundOf);
  const base = existing ?? original;
  const [id] = useState(() => existing?.id ?? Crypto.randomUUID());
  const [merchant, setMerchant] = useState(base?.merchant ?? '');
  const [currency, setCurrency] = useState(base ? base.currency ?? '' : 'BRL');
  const remaining = original ? (original.amountMinor ?? 0) - state.transactions.filter(t => t.refundOf === original.id).reduce((s, t) => s + (t.amountMinor ?? 0), 0) : null;
  const [amount, setAmount] = useState(moneyInput(original ? remaining : existing?.amountMinor ?? null, base?.currency ?? 'BRL'));
  const [date, setDate] = useState(existing?.date ?? localDate());
  const [cardId, setCardId] = useState(base?.cardId ?? '');
  const [categoryId, setCategoryId] = useState(base?.categoryId ?? 'other');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [confirmed, setConfirmed] = useState(existing?.confirmed ?? true);
  const [remember, setRemember] = useState(false), [error, setError] = useState(''), [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const kind = original ? 'refund' : existing?.kind ?? 'expense';
  const save = async () => {
    if (saving) return;
    setSaving(true); setError('');
    try {
      const code = currency.trim().toUpperCase();
      if (amount.trim() && !code) throw new Error('Informe a moeda antes de salvar um valor.');
      const t: Transaction = {
        id, eventKey: existing?.eventKey ?? null, amountMinor: code ? parseMoney(amount, code) : null,
        currency: code || null, date, merchant: merchant.trim(), cardId: cardId || null, categoryId, notes,
        source: existing?.source ?? 'manual', kind, refundOf: original?.id ?? existing?.refundOf ?? null,
        rawCard: existing?.rawCard ?? '', confirmed, recordedAt: existing?.recordedAt ?? new Date().toISOString(),
      };
      await update(s => saveTransaction(s, t, remember));
      navigation.goBack();
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível salvar.'); }
    finally { setSaving(false); }
  };
  const remove = async () => {
    setSaving(true); setError('');
    try { await update(s => deleteTransaction(s, id)); navigation.goBack(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível excluir.'); }
    finally { setSaving(false); }
  };
  const sourceLabel = { manual: 'Lançamento manual', shortcut: 'Automação do Atalhos', csv: 'Importação CSV', demo: 'Demonstração' };
  return <Screen form>
    <View><Label style={{ fontSize: 25, lineHeight: 32, fontWeight: '600' }}>{kind === 'refund' ? 'Registrar estorno' : existing ? 'Detalhes da despesa' : 'Uma nova despesa'}</Label>
      <Label muted>{existing ? sourceLabel[existing.source] : 'Cada detalhe ajuda a entender seus gastos.'}</Label></View>
    {existing && reviewReasons(existing).length > 0 && <Notice>Revise: {reviewReasons(existing).join(', ')}.</Notice>}
    {!!existing?.rawCard && <Notice>Cartão recebido: {existing.rawCard}. Associe abaixo ou cadastre esse nome nos apelidos do cartão.</Notice>}
    {!!(original || existing?.refundOf) && <Notice>Estorno vinculado à despesa original. A moeda e o cartão devem ser os mesmos.</Notice>}
    <View style={styles.row}><View style={{ flex: 2 }}><Field label="Valor" placeholder="0,00" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" /></View>
      <View style={styles.flex}><Field label="Moeda" placeholder="BRL" value={currency} onChangeText={v => setCurrency(v.toUpperCase())} autoCapitalize="characters" maxLength={3} /></View></View>
    <Field label="Estabelecimento" placeholder="Onde foi a compra?" value={merchant} onChangeText={v => {
      setMerchant(v); if (!existing && categoryId === 'other') setCategoryId(suggestCategory(state, v));
    }} />
    <Field label="Data da compra" placeholder="AAAA-MM-DD" value={date} onChangeText={setDate} maxLength={10} hint="Formato: ano-mês-dia, por exemplo 2026-10-20." />
    <Select label="Cartão utilizado" value={cardId} onChange={setCardId}
      options={[{ value: '', label: 'Associar depois' }, ...state.cards.map(c => ({ value: c.id, label: `${c.name}${c.last4 ? ` • ${c.last4}` : ''}` }))]} />
    <Button secondary title="Cadastrar cartão" icon="card-outline" onPress={() => navigation.navigate('CardForm')} />
    <Select label="Categoria" value={categoryId} onChange={setCategoryId} options={state.categories.map(c => ({ value: c.id, label: c.name }))} />
    <ToggleRow title="Usar esta categoria nas próximas compras" description="Cria uma regra para este estabelecimento." value={remember} onPress={() => setRemember(v => !v)} />
    <Field label="Observações" placeholder="Algum detalhe para lembrar?" value={notes} onChangeText={setNotes} multiline />
    <ToggleRow title="Conferi os dados deste registro" description="A confirmação é sua. Ela não comprova a liquidação pelo banco." value={confirmed} onPress={() => setConfirmed(v => !v)} />
    {!confirmed && <Notice>O registro ficará para revisão e será excluído dos totais até ser confirmado.</Notice>}
    {!!error && <Notice error>{error}</Notice>}
    <Button title={confirmed ? 'Salvar registro' : 'Salvar para revisar'} onPress={save} loading={saving} icon="checkmark" />
    {existing?.kind === 'expense' && existing.amountMinor !== null && <Button secondary title="Registrar estorno" icon="return-down-back-outline" disabled={saving}
      onPress={() => navigation.push('Transaction', { refundOf: existing.id })} />}
    {existing && (deleting ? <Notice>Excluir este registro? <Label onPress={remove} style={{ fontWeight: '700' }}>Confirmar exclusão</Label> · <Label onPress={() => setDeleting(false)}>Cancelar</Label></Notice> :
      <Button danger title="Excluir registro" icon="trash-outline" disabled={saving} onPress={() => setDeleting(true)} />)}
  </Screen>;
}
