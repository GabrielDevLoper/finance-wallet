import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { usePreventScreenCapture } from 'expo-screen-capture';
import { WalletProvider, useWallet } from './src/state/WalletProvider';
import { AppThemeProvider, useTheme } from './src/ui/theme';
import { Button, Icon, Label, Notice, styles } from './src/ui/components';
import type { RootStackParams, TabParams } from './src/navigation/types';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { TransactionsScreen } from './src/screens/TransactionsScreen';
import { CardsScreen } from './src/screens/CardsScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { TransactionFormScreen } from './src/screens/TransactionFormScreen';
import { CardFormScreen } from './src/screens/CardFormScreen';
import { CategoriesScreen } from './src/screens/CategoriesScreen';
import { BudgetsScreen } from './src/screens/BudgetsScreen';
import { IntegrationScreen } from './src/screens/IntegrationScreen';

const Stack = createNativeStackNavigator<RootStackParams>();
const Tab = createBottomTabNavigator<TabParams>();
const tabIcons: Record<keyof TabParams, string> = {
  Resumo: 'pie-chart-outline', Transações: 'list-outline', Cartões: 'card-outline', Ajustes: 'settings-outline',
};

function Tabs() {
  const t = useTheme();
  return <Tab.Navigator screenOptions={({ route }) => ({
    tabBarActiveTintColor: t.primary, tabBarInactiveTintColor: t.muted,
    tabBarStyle: { backgroundColor: t.surface, borderTopColor: t.border },
    headerStyle: { backgroundColor: t.bg }, headerTintColor: t.text, headerShadowVisible: false,
    tabBarIcon: ({ color, size }) => <Icon name={tabIcons[route.name]} size={size} color={color} />,
  })}>
    <Tab.Screen name="Resumo" component={DashboardScreen} />
    <Tab.Screen name="Transações" component={TransactionsScreen} />
    <Tab.Screen name="Cartões" component={CardsScreen} />
    <Tab.Screen name="Ajustes" component={SettingsScreen} />
  </Tab.Navigator>;
}

function Centered({ children }: React.PropsWithChildren) {
  const t = useTheme();
  return <View style={[s.center, { backgroundColor: t.bg }]}>{children}</View>;
}

function Gate() {
  const { ready, error, locked, hidden, notice, unlock, retry } = useWallet(), t = useTheme();
  // Keeps balances out of screenshots and the app switcher snapshot.
  usePreventScreenCapture();
  if (error) return <Centered><Notice error>{error}</Notice><Button title="Tentar novamente" onPress={retry} /></Centered>;
  if (!ready) return <Centered><ActivityIndicator color={t.primary} /></Centered>;
  if (locked) return <Centered>
    <Icon name="lock-closed-outline" size={40} color={t.primary} />
    <Label style={styles.sectionTitle}>Minha Carteira está bloqueada</Label>
    {!!notice && <Notice>{notice}</Notice>}
    <Button title="Desbloquear" icon="finger-print-outline" onPress={() => void unlock()} />
  </Centered>;
  const base = t.dark ? DarkTheme : DefaultTheme;
  return <View style={styles.flex}>
    <NavigationContainer theme={{ ...base, colors: { ...base.colors, primary: t.primary, background: t.bg, card: t.surface, text: t.text, border: t.border } }}>
      <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: t.bg }, headerTintColor: t.text, headerShadowVisible: false, headerBackTitle: 'Voltar' }}>
        <Stack.Screen name="Main" component={Tabs} options={{ headerShown: false }} />
        <Stack.Screen name="Transaction" component={TransactionFormScreen} options={{ title: 'Transação', presentation: 'modal' }} />
        <Stack.Screen name="CardForm" component={CardFormScreen} options={{ title: 'Cartão', presentation: 'modal' }} />
        <Stack.Screen name="Categories" component={CategoriesScreen} options={{ title: 'Categorias' }} />
        <Stack.Screen name="Budgets" component={BudgetsScreen} options={{ title: 'Orçamentos' }} />
        <Stack.Screen name="Integration" component={IntegrationScreen} options={{ title: 'Carteira Apple' }} />
      </Stack.Navigator>
    </NavigationContainer>
    {hidden && <View style={[StyleSheet.absoluteFill, s.center, { backgroundColor: t.bg }]}><Icon name="wallet-outline" size={40} color={t.primary} /></View>}
  </View>;
}

function Themed() {
  const t = useTheme();
  return <><StatusBar style={t.dark ? 'light' : 'dark'} /><Gate /></>;
}

export default function App() {
  return <SafeAreaProvider><WalletProvider><AppThemeProvider><Themed /></AppThemeProvider></WalletProvider></SafeAreaProvider>;
}

const s = StyleSheet.create({ center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 } });
