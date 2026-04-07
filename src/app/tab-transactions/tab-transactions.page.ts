import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { TransactionService } from '../services/transaction.service';
import { OfflineStorageService } from '../services/offline-storage.service';
import { Transaction } from '../models/transaction.model';

@Component({
  selector: 'app-tab-transactions',
  templateUrl: 'tab-transactions.page.html',
  styleUrls: ['tab-transactions.page.scss'],
  standalone: false,
})
export class TabTransactionsPage implements OnInit, OnDestroy {
  transactions: Transaction[] = [];
  pendingTransactions: Transaction[] = [];
  isLoading = true;
  expandedId: string | null = null;

  private transactionsSub?: Subscription;

  constructor(
    private transactionService: TransactionService,
    private offlineStorage: OfflineStorageService
  ) {}

  ngOnInit(): void {
    this.transactionsSub = this.transactionService.getTransactions().subscribe(transactions => {
      this.transactions = transactions;
      this.isLoading = false;
    });

    this.loadPendingTransactions();
  }

  async loadPendingTransactions(): Promise<void> {
    this.pendingTransactions = await this.offlineStorage.getPendingTransactions();
  }

  toggleExpand(id: string): void {
    this.expandedId = this.expandedId === id ? null : id;
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'synced': return 'success';
      case 'pending': return 'warning';
      case 'failed': return 'danger';
      default: return 'medium';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'synced': return 'checkmark-circle';
      case 'pending': return 'time';
      case 'failed': return 'close-circle';
      default: return 'help-circle';
    }
  }

  formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleString();
  }

  formatShortDate(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  formatTime(timestamp: number): string {
    return new Date(timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }

  ngOnDestroy(): void {
    this.transactionsSub?.unsubscribe();
  }
}
