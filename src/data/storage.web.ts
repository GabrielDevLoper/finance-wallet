import { WalletRepository } from './repository';
import { demoWallet } from '../domain/demo';
let memory = JSON.stringify(demoWallet());
const repository = new WalletRepository({ read: async () => memory, write: async value => { memory = value; } });
export async function openStorage() {
  return { repository, demo: true };
}
