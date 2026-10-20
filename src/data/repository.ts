import { emptyWallet, WalletState } from '../domain/model';

export interface SnapshotStorage {
  read(): Promise<string | null>;
  write(value: string): Promise<void>;
}
/** Serializes read/modify/write operations; publishes only durable snapshots. */
export class WalletRepository {
  private current: WalletState | null = null;
  private queue: Promise<unknown> = Promise.resolve();
  constructor(private readonly storage: SnapshotStorage) {}
  async load(): Promise<WalletState> {
    const raw = await this.storage.read();
    if (!raw) return this.current = emptyWallet();
    const parsed = JSON.parse(raw) as WalletState;
    if (parsed.version !== 1 || !Array.isArray(parsed.transactions) || !Array.isArray(parsed.cards) ||
      !Array.isArray(parsed.categories) || !Array.isArray(parsed.processedEvents) || !parsed.settings ||
      !Array.isArray(parsed.budgets) || !parsed.integration || !parsed.rules) {
      throw new Error('O banco possui um formato incompatível. Seus dados foram preservados.');
    }
    return this.current = parsed;
  }
  update(change: (state: WalletState) => WalletState): Promise<WalletState> {
    const operation = this.queue.then(async () => {
      const previous = this.current ?? await this.load();
      const next = change(previous);
      if (next !== previous) await this.storage.write(JSON.stringify(next));
      this.current = next;
      return next;
    });
    this.queue = operation.catch(() => undefined);
    return operation;
  }
}
