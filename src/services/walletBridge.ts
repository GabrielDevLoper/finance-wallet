import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';
import type { WalletEvent } from '../domain/ledger';
interface NativeWallet {
  pending(): Promise<string[]>;
  acknowledge(id: string): Promise<void>;
  clear(): Promise<void>;
}
export const walletBridge = Platform.OS === 'ios' ? requireOptionalNativeModule<NativeWallet>('WalletInbox') : null;
export async function pendingEvents(): Promise<WalletEvent[]> {
  if (!walletBridge) return [];
  return (await walletBridge.pending()).map(raw => {
    const event: unknown = JSON.parse(raw);
    if (!event || typeof event !== 'object' || !('id' in event) || typeof event.id !== 'string' ||
      !('recordedAt' in event) || typeof event.recordedAt !== 'string' || Number.isNaN(Date.parse(event.recordedAt))) {
      throw new Error('Um registro do Atalhos precisa ser verificado. A fila foi preservada.');
    }
    return event as WalletEvent;
  });
}
