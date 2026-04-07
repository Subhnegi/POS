import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage-angular';
import { Product } from '../models/product.model';
import { Transaction } from '../models/transaction.model';

@Injectable({
  providedIn: 'root'
})
export class OfflineStorageService {
  private _storage: Storage | null = null;
  private readonly PRODUCTS_KEY = 'cached_products';
  private readonly PENDING_TRANSACTIONS_KEY = 'pending_transactions';

  constructor(private storage: Storage) {
    this.init();
  }

  async init(): Promise<void> {
    if (!this._storage) {
      this._storage = await this.storage.create();
    }
  }

  // Products cache
  async cacheProducts(products: Product[]): Promise<void> {
    await this.init();
    await this._storage?.set(this.PRODUCTS_KEY, JSON.stringify(products));
  }

  async getCachedProducts(): Promise<Product[]> {
    await this.init();
    const data = await this._storage?.get(this.PRODUCTS_KEY);
    return data ? JSON.parse(data) : [];
  }

  // Pending transactions
  async savePendingTransaction(transaction: Transaction): Promise<void> {
    await this.init();
    const pending = await this.getPendingTransactions();
    pending.push(transaction);
    await this._storage?.set(this.PENDING_TRANSACTIONS_KEY, JSON.stringify(pending));
  }

  async getPendingTransactions(): Promise<Transaction[]> {
    await this.init();
    const data = await this._storage?.get(this.PENDING_TRANSACTIONS_KEY);
    return data ? JSON.parse(data) : [];
  }

  async removePendingTransaction(transactionId: string): Promise<void> {
    await this.init();
    const pending = await this.getPendingTransactions();
    const filtered = pending.filter(t => t.id !== transactionId);
    await this._storage?.set(this.PENDING_TRANSACTIONS_KEY, JSON.stringify(filtered));
  }

  async clearPendingTransactions(): Promise<void> {
    await this.init();
    await this._storage?.set(this.PENDING_TRANSACTIONS_KEY, JSON.stringify([]));
  }

  async updatePendingTransactionStatus(transactionId: string, status: 'pending' | 'synced' | 'failed'): Promise<void> {
    await this.init();
    const pending = await this.getPendingTransactions();
    const transaction = pending.find(t => t.id === transactionId);
    if (transaction) {
      transaction.status = status;
      await this._storage?.set(this.PENDING_TRANSACTIONS_KEY, JSON.stringify(pending));
    }
  }
}
