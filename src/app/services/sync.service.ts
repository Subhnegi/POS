import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  getDoc,
  writeBatch
} from '@angular/fire/firestore';
import { ToastController } from '@ionic/angular';
import { NetworkService } from './network.service';
import { OfflineStorageService } from './offline-storage.service';
import { Transaction } from '../models/transaction.model';
import { Subscription } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SyncService {
  private isSyncing = false;
  private networkSub: Subscription;

  constructor(
    private firestore: Firestore,
    private networkService: NetworkService,
    private offlineStorage: OfflineStorageService,
    private toastController: ToastController
  ) {
    // Listen for network changes and auto-sync
    this.networkSub = this.networkService.isOnline$.subscribe(isOnline => {
      if (isOnline) {
        this.syncPendingTransactions();
      }
    });
  }

  async syncPendingTransactions(): Promise<void> {
    if (this.isSyncing) return;
    this.isSyncing = true;

    try {
      const pendingTransactions = await this.offlineStorage.getPendingTransactions();
      if (pendingTransactions.length === 0) {
        this.isSyncing = false;
        return;
      }

      let syncedCount = 0;
      let failedCount = 0;

      for (const transaction of pendingTransactions) {
        if (transaction.status !== 'pending') continue;

        try {
          const hasStock = await this.validateStock(transaction);

          if (hasStock) {
            await this.pushTransactionToFirestore(transaction);
            await this.offlineStorage.removePendingTransaction(transaction.id);
            syncedCount++;
          } else {
            await this.offlineStorage.updatePendingTransactionStatus(transaction.id, 'failed');
            failedCount++;
          }
        } catch (error) {
          console.error('Error syncing transaction:', transaction.id, error);
          failedCount++;
        }
      }

      if (syncedCount > 0) {
        await this.showToast(`${syncedCount} transaction(s) synced successfully`, 'success');
      }
      if (failedCount > 0) {
        await this.showToast(`${failedCount} transaction(s) failed due to insufficient stock`, 'danger');
      }
    } catch (error) {
      console.error('Sync error:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  private async validateStock(transaction: Transaction): Promise<boolean> {
    for (const item of transaction.items) {
      const productRef = doc(this.firestore, 'products', item.productId);
      const productSnap = await getDoc(productRef);

      if (!productSnap.exists()) return false;

      const product = productSnap.data() as { stock: number };
      if (product.stock < item.quantity) return false;
    }
    return true;
  }

  private async pushTransactionToFirestore(transaction: Transaction): Promise<void> {
    const batch = writeBatch(this.firestore);

    // Add the transaction
    const transactionsRef = collection(this.firestore, 'transactions');
    const transDoc = doc(transactionsRef);
    const { id, ...transactionData } = transaction;
    batch.set(transDoc, { ...transactionData, status: 'synced' });

    // Deduct stock
    for (const item of transaction.items) {
      const productRef = doc(this.firestore, 'products', item.productId);
      const productSnap = await getDoc(productRef);
      if (productSnap.exists()) {
        const currentStock = (productSnap.data() as { stock: number }).stock;
        const newStock = Math.max(0, currentStock - item.quantity);
        batch.update(productRef, { stock: newStock });
      }
    }

    await batch.commit();
  }

  private async showToast(message: string, color: string): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'top'
    });
    await toast.present();
  }
}
