import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { emptyWallet, WalletState } from '../domain/model';
import { ingestEvent } from '../domain/ledger';
import { WalletRepository } from '../data/repository';
import { openStorage } from '../data/storage';
import { pendingEvents, walletBridge } from '../services/walletBridge';

interface WalletContextValue {
  state: WalletState;
  ready: boolean;
  error: string | null;
  notice: string | null;
  demo: boolean;
  locked: boolean;
  hidden: boolean;
  update: (fn: (state: WalletState) => WalletState) => Promise<void>;
  unlock: () => Promise<void>;
  setLock: (enabled: boolean) => Promise<void>;
  sync: () => Promise<void>;
  reset: () => Promise<void>;
  retry: () => void;
  clearNotice: () => void;
}
const Context = createContext<WalletContextValue | null>(null);
export function WalletProvider({ children }: React.PropsWithChildren) {
  const [state, setState] = useState(emptyWallet);
  const [ready, setReady] = useState(false), [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null), [demo, setDemo] = useState(false);
  const [locked, setLocked] = useState(true), [hidden, setHidden] = useState(false), [attempt, setAttempt] = useState(0);
  const repository = useRef<WalletRepository | null>(null), stateRef = useRef(state);
  const isDemo = useRef(false), syncing = useRef(false), authenticating = useRef(false);
  stateRef.current = state;
  const update = useCallback(async (change: (s: WalletState) => WalletState) => {
    if (!repository.current) throw new Error('O banco ainda está carregando.');
    const next = await repository.current.update(change);
    stateRef.current = next;
    setState(next);
  }, []);
  useEffect(() => {
    let active = true;
    setReady(false); setError(null);
    openStorage().then(async result => {
      const next = await result.repository.load();
      if (!active) return;
      repository.current = result.repository; isDemo.current = result.demo;
      setDemo(result.demo); stateRef.current = next; setState(next);
      setLocked(next.settings.lock && !result.demo); setReady(true);
    }).catch(e => { if (active) setError(e instanceof Error ? e.message : 'Não foi possível abrir o banco.'); });
    return () => { active = false; };
  }, [attempt]);
  const sync = useCallback(async () => {
    if (!repository.current || isDemo.current || !walletBridge || syncing.current) return;
    syncing.current = true;
    try {
      for (const event of await pendingEvents()) {
        await update(s => ingestEvent(s, event));
        // Only acknowledge after the expense and its idempotency key are committed.
        await walletBridge.acknowledge(event.id);
      }
    } catch (e) { setNotice(e instanceof Error ? e.message : 'Não foi possível receber os registros. Tente novamente.'); }
    finally { syncing.current = false; }
  }, [update]);
  useEffect(() => { if (ready && !locked) void sync(); }, [ready, locked, sync]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', value => {
      setHidden(value !== 'active');
      if (value === 'background' && stateRef.current.settings.lock && !isDemo.current) setLocked(true);
      if (value === 'active' && !stateRef.current.settings.lock) void sync();
    });
    return () => subscription.remove();
  }, [sync]);
  const authenticate = async () => {
    if (Platform.OS === 'web') throw new Error('A biometria está disponível no aplicativo instalado.');
    if (!await LocalAuthentication.hasHardwareAsync() || !await LocalAuthentication.isEnrolledAsync()) {
      throw new Error('Configure Face ID ou biometria nas opções de segurança do aparelho.');
    }
    if (authenticating.current) return false;
    authenticating.current = true;
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Abrir Minha Carteira', cancelLabel: 'Cancelar',
        disableDeviceFallback: false, fallbackLabel: 'Usar código do aparelho',
      });
      return result.success;
    } finally { authenticating.current = false; }
  };
  const unlock = async () => {
    try {
      if (await authenticate()) { setLocked(false); setNotice(null); await sync(); }
      else setNotice('Acesso não autorizado. Tente novamente quando quiser.');
    } catch (e) { setNotice(e instanceof Error ? e.message : 'Falha na autenticação.'); }
  };
  const setLock = async (enabled: boolean) => {
    if (isDemo.current) throw new Error('Instale uma versão nativa para ativar o bloqueio.');
    if (!await authenticate()) throw new Error('A alteração foi cancelada.');
    await update(s => ({ ...s, settings: { ...s.settings, lock: enabled } }));
  };
  const reset = async () => {
    if (syncing.current) throw new Error('Aguarde o recebimento dos registros e tente novamente.');
    if (stateRef.current.settings.lock && !await authenticate()) throw new Error('A exclusão foi cancelada.');
    syncing.current = true;
    try {
      await walletBridge?.clear();
      await update(() => emptyWallet());
      setLocked(false);
    } finally { syncing.current = false; }
  };
  return <Context.Provider value={{ state, ready, error, notice, demo, locked, hidden, update, unlock, setLock, sync, reset,
    retry: () => setAttempt(n => n + 1), clearNotice: () => setNotice(null) }}>{children}</Context.Provider>;
}
export function useWallet() {
  const context = useContext(Context);
  if (!context) throw new Error('WalletProvider ausente.');
  return context;
}
