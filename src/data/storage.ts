import * as SQLite from 'expo-sqlite';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { WalletRepository } from './repository';
import { demoWallet } from '../domain/demo';

export interface StorageResult { repository: WalletRepository; demo: boolean }
let initialized: Promise<StorageResult> | null = null;
export function openStorage(): Promise<StorageResult> {
  return initialized ??= initialize().catch(error => { initialized = null; throw error; });
}
async function initialize(): Promise<StorageResult> {
  const db = await SQLite.openDatabaseAsync('minha-carteira.db');
  const cipher = await db.getFirstAsync<Record<string, string>>('PRAGMA cipher_version');
  if (!cipher || Object.keys(cipher).length === 0) {
    await db.closeAsync();
    // Expo Go cannot use SQLCipher. Do not silently store real financial data unencrypted.
    let memory = JSON.stringify(demoWallet());
    return { demo: true, repository: new WalletRepository({
      read: async () => memory, write: async value => { memory = value; },
    }) };
  }
  let key = await SecureStore.getItemAsync('wallet.database-key');
  if (!key) {
    key = Array.from(await Crypto.getRandomBytesAsync(32), b => b.toString(16).padStart(2, '0')).join('');
    await SecureStore.setItemAsync('wallet.database-key', key, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
  }
  if (!/^[a-f0-9]{64}$/.test(key)) throw new Error('Chave local inválida. O banco foi preservado.');
  await db.execAsync(`PRAGMA key = "x'${key}'";`);
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA secure_delete = ON; CREATE TABLE IF NOT EXISTS wallet (id INTEGER PRIMARY KEY CHECK (id = 1), payload TEXT NOT NULL);');
  return { demo: false, repository: new WalletRepository({
    read: async () => (await db.getFirstAsync<{ payload: string }>('SELECT payload FROM wallet WHERE id = 1'))?.payload ?? null,
    write: async payload => { await db.runAsync('INSERT INTO wallet (id, payload) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET payload = excluded.payload', payload); },
  }) };
}
