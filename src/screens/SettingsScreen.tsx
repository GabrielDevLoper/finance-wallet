import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AppNavigation } from '../navigation/types';
import { useWallet } from '../state/WalletProvider';
import { exportCSV, importCSV, ImportResult } from '../domain/csv';
import { pickCSV, shareCSV } from '../services/files';
import { localDate } from '../domain/money';
import { Button, Icon, Label, MonthPicker, Notice, Panel, Screen, SectionTitle, Select, Title, ToggleRow, styles } from '../ui/components';
import { useTheme } from '../ui/theme';
import { walletBridge } from '../services/walletBridge';
export function SettingsScreen() {
  const { state, update, demo, setLock, reset } = useWallet(), t = useTheme();
  const navigation = useNavigation<AppNavigation>();
  const [month, setMonth] = useState(localDate().slice(0, 7));
  const [message, setMessage] = useState(''), [busy, setBusy] = useState(false), [erase, setErase] = useState(false);
  const [pendingImport, setPendingImport] = useState<{ text: string; id: string; preview: ImportResult } | null>(null);
  const run = async (action: () => Promise<void>) => {
    if (busy) return;
    setBusy(true); setMessage('');
    try { await action(); } catch (e) { setMessage(e instanceof Error ? e.message : 'A operação não foi concluída.'); }
    finally { setBusy(false); }
  };
  const importFile = () => run(async () => {
    const file = await pickCSV();
    if (file) setPendingImport({ ...file, preview: importCSV(state, file.text, file.id) });
  });
  const confirmImport = () => run(async () => {
    if (!pendingImport) return;
    let summary = '';
    await update(s => {
      const result = importCSV(s, pendingImport.text, pendingImport.id);
      summary = `${result.added} importados, ${result.skipped} já existentes e ${result.errors.length} linhas inválidas.`;
      return result.state;
    });
    setPendingImport(null); setMessage(summary);
  });
  const entries = [
    { title: 'Conectar ao Atalhos', detail: demo || !walletBridge ? 'Indisponível nesta prévia' : state.integration.userVerifiedAt ? 'Verificado por você neste aparelho' : 'Disponível · teste pendente', icon: 'link-outline', screen: 'Integration' as const },
    { title: 'Categorias e regras', detail: 'Organize os gastos do seu jeito', icon: 'grid-outline', screen: 'Categories' as const },
    { title: 'Orçamentos mensais', detail: 'Limites gerais e por categoria', icon: 'pie-chart-outline', screen: 'Budgets' as const },
  ];
  return <Screen>
    <View><Label muted style={styles.small}>DO SEU JEITO</Label><Title>Ajustes</Title></View>
    {demo && <Notice>Esta é uma demonstração temporária. Use somente dados fictícios. Para dados reais, instale a versão nativa com banco criptografado.</Notice>}
    <Panel>{entries.map(item => <Pressable accessibilityRole="button" key={item.screen} onPress={() => navigation.navigate(item.screen)}
      style={[styles.row, { paddingVertical: 10 }]}><Icon name={item.icon} color={t.primary} /><View style={styles.flex}><Label style={styles.fieldLabel}>{item.title}</Label><Label muted style={styles.small}>{item.detail}</Label></View><Icon name="chevron-forward" size={16} color={t.muted} /></Pressable>)}</Panel>
    <Panel><SectionTitle>Preferências</SectionTitle>
      <Select label="Aparência" value={state.settings.theme} onChange={value => void run(() => update(s => ({ ...s, settings: { ...s.settings, theme: value as 'system' | 'dark' | 'light' } })))}
        options={[{ value: 'system', label: 'Seguir o aparelho' }, { value: 'light', label: 'Claro' }, { value: 'dark', label: 'Escuro' }]} />
      <ToggleRow title="Alertas de orçamento" description="Avisos no resumo quando o gasto atingir 80% do limite." value={state.settings.budgetAlerts}
        onPress={() => void run(() => update(s => ({ ...s, settings: { ...s.settings, budgetAlerts: !s.settings.budgetAlerts } })))} />
      <ToggleRow title="Bloqueio por Face ID ou biometria" description="Solicita autenticação ao abrir e ao voltar do segundo plano." value={state.settings.lock} onPress={() => void run(() => setLock(!state.settings.lock))} />
    </Panel>
    <Panel><SectionTitle>Seus dados</SectionTitle>
      <Label muted>Os registros ficam neste aparelho. Não há conta, anúncios ou envio dos gastos para serviços de IA.</Label>
      <Button secondary title="Importar CSV" icon="download-outline" onPress={importFile} disabled={busy} />
      <Label muted style={styles.small}>Colunas: data, valor, moeda, estabelecimento, cartao, categoria. Use o arquivo exportado como modelo.</Label>
      {pendingImport && <>
        <Notice>Prévia: {pendingImport.preview.added} novos registros, {pendingImport.preview.skipped} já existentes e {pendingImport.preview.errors.length} linhas inválidas.</Notice>
        {pendingImport.preview.errors.slice(0, 8).map((e, i) => <Label key={i} style={[styles.small, { color: t.danger }]}>{e}</Label>)}
        <Button title="Importar linhas válidas" onPress={confirmImport} loading={busy} disabled={!pendingImport.preview.added} />
        <Button secondary title="Cancelar importação" disabled={busy} onPress={() => setPendingImport(null)} />
      </>}
      <MonthPicker month={month} onChange={setMonth} />
      <Button secondary title="Exportar relatório do mês" icon="share-outline" disabled={busy} onPress={() => void run(() => shareCSV(exportCSV(state, state.transactions.filter(x => x.date.startsWith(month))), `gastos-${month}.csv`))} />
      <Button secondary title="Exportar todas as transações" disabled={busy} onPress={() => void run(() => shareCSV(exportCSV(state)))} />
      <Label muted style={styles.small}>O CSV contém dados financeiros sem criptografia. Escolha onde salvá-lo. Cada linha mantém sua moeda; não há conversão automática.</Label>
    </Panel>
    {!!message && <Notice>{message}</Notice>}
    <Panel><SectionTitle>Privacidade</SectionTitle>
      <Label muted>{demo ? 'Nesta prévia, os dados ficam apenas na memória.' : 'Banco local criptografado e chaves protegidas pelo aparelho. Sem sincronização em nuvem.'}</Label>
      {erase && <Notice>A exclusão apaga cartões, gastos, regras, orçamentos e registros pendentes neste aparelho. Exporte antes se quiser guardar uma cópia. Desative também a automação no Atalhos.</Notice>}
      <Button danger title={erase ? 'Confirmar exclusão de todos os dados' : 'Apagar todos os dados'} icon="trash-outline" disabled={busy} onPress={() => erase ? void run(async () => { await reset(); setErase(false); setMessage('Dados apagados.'); }) : setErase(true)} />
      {erase && <Button secondary title="Cancelar" disabled={busy} onPress={() => setErase(false)} />}
    </Panel>
    <Label muted style={[styles.small, { textAlign: 'center' }]}>Minha Carteira · 1.0.0{'\n'}Feito para tornar seus gastos mais claros.</Label>
  </Screen>;
}
