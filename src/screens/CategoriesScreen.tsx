import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import * as Crypto from 'expo-crypto';
import { useWallet } from '../state/WalletProvider';
import { palette } from '../domain/model';
import { Button, Field, Icon, Label, Notice, Panel, Screen, SectionTitle, Select, styles } from '../ui/components';
const icons = ['restaurant-outline', 'basket-outline', 'car-outline', 'home-outline', 'heart-outline', 'ticket-outline', 'bag-outline', 'book-outline', 'repeat-outline', 'gift-outline', 'airplane-outline', 'paw-outline', 'grid-outline'];
export function CategoriesScreen() {
  const { state, update } = useWallet();
  const [id, setId] = useState(''), [name, setName] = useState(''), [icon, setIcon] = useState('grid-outline'), [color, setColor] = useState(palette[0]!);
  const [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const choose = (value: string) => {
    const category = state.categories.find(c => c.id === value);
    setId(value); setName(category?.name ?? ''); setIcon(category?.icon ?? 'grid-outline'); setColor(category?.color ?? palette[0]!);
  };
  const save = async () => {
    setError(''); setBusy(true);
    try {
      if (!name.trim()) throw new Error('Informe o nome da categoria.');
      if (state.categories.some(c => c.id !== id && c.name.toLowerCase() === name.trim().toLowerCase())) throw new Error('Essa categoria já existe.');
      const category = { id: id || Crypto.randomUUID(), name: name.trim(), color, icon };
      await update(s => ({ ...s, categories: id ? s.categories.map(c => c.id === id ? category : c) : [...s.categories, category] }));
      choose('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível salvar.'); }
    finally { setBusy(false); }
  };
  return <Screen form>
    <Select label="Categoria" value={id} onChange={choose} options={[{ value: '', label: 'Criar nova categoria' }, ...state.categories.map(c => ({ value: c.id, label: c.name }))]} />
    <Field label="Nome" value={name} onChangeText={setName} placeholder="Nome da categoria" maxLength={32} />
    <Label style={styles.fieldLabel}>Ícone</Label><View style={[styles.row, { flexWrap: 'wrap' }]}>{icons.map(i => <Pressable key={i} accessibilityRole="button" accessibilityLabel={`Ícone ${i}`} accessibilityState={{ selected: i === icon }} onPress={() => setIcon(i)}
      style={{ padding: 12, backgroundColor: i === icon ? `${color}30` : 'transparent', borderRadius: 12 }}><Icon name={i} color={color} /></Pressable>)}</View>
    <Label style={styles.fieldLabel}>Cor</Label><View style={styles.row}>{palette.map(c => <Pressable key={c} accessibilityRole="button" accessibilityLabel={`Cor ${c}`} onPress={() => setColor(c)}
      style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c, alignItems: 'center', justifyContent: 'center' }}>{color === c && <Icon name="checkmark" color="#fff" />}</Pressable>)}</View>
    {!!error && <Notice error>{error}</Notice>}
    <Button title={id ? 'Salvar categoria' : 'Criar categoria'} onPress={save} loading={busy} />
    <Panel><SectionTitle>Regras por estabelecimento</SectionTitle>
      <Label muted style={styles.small}>Crie uma regra ao editar uma despesa e ativar “Usar esta categoria nas próximas compras”.</Label>
      {Object.entries(state.rules).map(([merchant, categoryId]) => <View key={merchant} style={styles.row}><View style={styles.flex}><Label>{merchant}</Label><Label muted style={styles.small}>{state.categories.find(c => c.id === categoryId)?.name}</Label></View>
        <Pressable accessibilityRole="button" accessibilityLabel={`Remover regra de ${merchant}`} onPress={() => {
          void update(s => { const rules = { ...s.rules }; delete rules[merchant]; return { ...s, rules }; }).catch(e => setError(String(e)));
        }}><Icon name="close-circle-outline" /></Pressable></View>)}
      {!Object.keys(state.rules).length && <Label muted>Nenhuma regra personalizada ainda.</Label>}
    </Panel>
  </Screen>;
}
