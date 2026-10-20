import React, { useState } from 'react';
import { Linking, View } from 'react-native';
import { useWallet } from '../state/WalletProvider';
import { walletBridge } from '../services/walletBridge';
import { Button, Icon, Label, Notice, Panel, Screen, SectionTitle, styles } from '../ui/components';
import { useTheme } from '../ui/theme';
const steps = [
  ['Prepare seu cartão', 'Cadastre o cartão em Minha Carteira. Em “Nomes recebidos pelo Atalhos”, salve um apelido único, como “visa-pessoal”.'],
  ['Crie uma automação', 'No app Atalhos, abra Automação → + → Transação ou Carteira. Selecione o cartão e a opção de executar imediatamente, se disponível.'],
  ['Adicione a ação do app', 'Busque “Registrar gasto na Minha Carteira”. Essa ação aparece somente depois de instalar uma versão nativa e abrir o aplicativo.'],
  ['Associe os campos disponíveis', 'Use a variável Transação: Valor (propriedade numérica), Estabelecimento e Cartão ou passe. Se houver código da moeda, associe-o. Os nomes variam conforme o iOS.'],
  ['Identifique o cartão e a moeda', 'Se o cartão não chegar de forma consistente, configure uma automação por cartão e preencha o apelido fixo. Use BRL fixo somente se essa automação for exclusiva para compras em reais. Não adivinhe valores ausentes.'],
  ['Teste no seu iPhone', 'Faça uma compra real por aproximação. Abra Minha Carteira, receba os registros e confira valor, moeda, data e cartão com o banco. Corrija o que faltar e confirme o registro.'],
];
export function IntegrationScreen() {
  const { state, demo, sync, update } = useWallet(), t = useTheme();
  const [message, setMessage] = useState(''), [busy, setBusy] = useState(false);
  const available = !!walletBridge && !demo;
  const canVerify = available && state.transactions.some(x => x.source === 'shortcut' && x.confirmed && x.amountMinor && x.currency && x.cardId);
  const status = !available ? 'Indisponível nesta versão' : state.integration.userVerifiedAt ? 'Verificada por você' : 'Disponível · validação pendente';
  return <Screen>
    <Panel><View style={styles.row}><Icon name="logo-apple" size={30} /><View style={styles.flex}><Label style={styles.sectionTitle}>Carteira + Atalhos</Label><Label muted>{status}</Label></View></View>
      <Label muted>Receba os dados disponíveis de novas compras por aproximação e organize tudo em um só lugar.</Label></Panel>
    {!available && <Notice>É necessário instalar uma versão nativa para iPhone. A integração não funciona no navegador, no Android ou no Expo Go.</Notice>}
    <Notice>O acionador indica uma aproximação, não uma compra liquidada pelo banco. O app não acessa todo o histórico da Carteira. A cobertura depende do iOS, do cartão e dos campos que chegarem.</Notice>
    {steps.map(([title, detail], i) => <View key={title} style={[styles.row, { alignItems: 'flex-start', gap: 14 }]}>
      <View style={{ backgroundColor: t.soft, width: 32, height: 32, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}><Label style={styles.fieldLabel}>{i + 1}</Label></View>
      <View style={[styles.flex, { gap: 5 }]}><Label style={styles.fieldLabel}>{title}</Label><Label muted>{detail}</Label></View></View>)}
    <Panel><SectionTitle>Conferir o recebimento</SectionTitle>
      <Label muted>{state.integration.lastReceived ? `Último evento recebido: ${new Date(state.integration.lastReceived).toLocaleString('pt-BR')}` : 'Nenhum evento real recebido ainda.'}</Label>
      <Button title="Receber registros pendentes" icon="refresh-outline" disabled={!available} loading={busy} onPress={() => {
        setBusy(true); void sync().finally(() => setBusy(false));
      }} />
      <Button secondary title="Conferi uma compra real neste aparelho" disabled={!canVerify || busy} onPress={() => {
        void update(s => ({ ...s, integration: { ...s.integration, userVerifiedAt: new Date().toISOString() } }))
          .then(() => setMessage('Verificação pessoal registrada. Outros cartões e cenários ainda precisam ser testados.')).catch(e => setMessage(String(e)));
      }} />
      {!canVerify && <Label muted style={styles.small}>A verificação fica disponível após receber e confirmar um registro do Atalhos.</Label>}
    </Panel>
    {!!message && <Notice>{message}</Notice>}
    <Panel><SectionTitle>O que esperar</SectionTitle>
      <Label muted>Os eventos ficam protegidos no aparelho até você abrir o app. Campos ausentes ficam para revisão. Compras online, Apple Watch, cobranças recorrentes e estornos não têm captura garantida.</Label>
      <Label muted>Se configurar duas automações para a mesma compra, dois registros podem chegar. Um ID estável evita reprocessar o mesmo evento; sem ele, compras parecidas são mantidas para sua conferência.</Label>
      <Label muted>FinanceKit não está habilitado neste MVP brasileiro. A documentação atual da Apple contempla contas elegíveis nos EUA e no Reino Unido, com autorização específica.</Label>
      <Button secondary title="Consultar guia oficial da Apple" onPress={() => void Linking.openURL('https://support.apple.com/pt-br/guide/shortcuts/apd65c67538a/ios').catch(() => setMessage('Não foi possível abrir o guia.'))} />
    </Panel>
  </Screen>;
}
