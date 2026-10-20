import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import * as Crypto from 'expo-crypto';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParams } from '../navigation/types';
import { useWallet } from '../state/WalletProvider';
import { saveCard } from '../domain/ledger';
import { palette } from '../domain/model';
import { Button, Field, Icon, Label, Notice, Screen, Select, styles } from '../ui/components';
export function CardFormScreen({ route, navigation }: NativeStackScreenProps<RootStackParams, 'CardForm'>) {
  const { state, update } = useWallet();
  const existing = state.cards.find(c => c.id === route.params?.id);
  const [id] = useState(() => existing?.id ?? Crypto.randomUUID());
  const [name, setName] = useState(existing?.name ?? ''), [bank, setBank] = useState(existing?.bank ?? '');
  const [last4, setLast4] = useState(existing?.last4 ?? ''), [brand, setBrand] = useState(existing?.brand ?? 'Visa');
  const [color, setColor] = useState(existing?.color ?? palette[0]!);
  const [aliases, setAliases] = useState(existing?.aliases.join('\n') ?? '');
  const [error, setError] = useState(''), [saving, setSaving] = useState(false), [deleting, setDeleting] = useState(false);
  const save = async () => {
    setSaving(true); setError('');
    try {
      await update(s => saveCard(s, { id, name: name.trim(), bank: bank.trim(), last4, brand, color, aliases: aliases.split('\n') }));
      navigation.goBack();
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível salvar.'); }
    finally { setSaving(false); }
  };
  const remove = async () => {
    setSaving(true);
    try {
      await update(s => {
        if (s.transactions.some(t => t.cardId === id)) throw new Error('Este cartão tem transações. Reassocie ou exclua esses registros primeiro.');
        return { ...s, cards: s.cards.filter(c => c.id !== id) };
      });
      navigation.goBack();
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível excluir.'); }
    finally { setSaving(false); }
  };
  return <Screen form>
    <Notice>Somente informações para identificar o cartão. Nunca informe número completo, CVV ou senha.</Notice>
    <Field label="Apelido" value={name} onChangeText={setName} placeholder="Meu dia a dia" maxLength={40} />
    <Field label="Banco" value={bank} onChangeText={setBank} placeholder="Nome do banco (opcional)" maxLength={40} />
    <Select label="Bandeira" value={brand} onChange={setBrand} options={['Visa', 'Mastercard', 'Elo', 'American Express', 'Outra'].map(b => ({ value: b, label: b }))} />
    <Field label="Últimos quatro dígitos (opcional)" value={last4} onChangeText={setLast4} placeholder="1234" maxLength={4} keyboardType="number-pad" />
    <Label style={styles.fieldLabel}>Cor do cartão</Label>
    <View style={styles.row}>{palette.map(c => <Pressable key={c} accessibilityRole="button" accessibilityLabel={`Cor ${c}`} accessibilityState={{ selected: color === c }}
      onPress={() => setColor(c)} style={{ backgroundColor: c, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}>{color === c && <Icon name="checkmark" color="#FFF" />}</Pressable>)}</View>
    <Field label="Nomes recebidos pelo Atalhos" value={aliases} onChangeText={setAliases} multiline placeholder="Um nome por linha"
      hint="Copie o texto recebido em “Cartão ou passe”, ou defina um apelido fixo na automação. Os registros pendentes correspondentes serão associados." />
    {!!error && <Notice error>{error}</Notice>}
    <Button title="Salvar cartão" onPress={save} loading={saving} />
    {existing && <Button danger title={deleting ? 'Confirmar exclusão do cartão' : 'Excluir cartão'} disabled={saving} onPress={() => deleting ? void remove() : setDeleting(true)} />}
  </Screen>;
}
