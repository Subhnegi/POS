import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { ProductService } from '../services/product.service';
import { TransactionService } from '../services/transaction.service';
import { CounterService } from '../services/counter.service';
import { NetworkService } from '../services/network.service';
import { SyncService } from '../services/sync.service';
import { OfflineStorageService } from '../services/offline-storage.service';
import { Product } from '../models/product.model';
import { Transaction } from '../models/transaction.model';

@Component({
  selector: 'app-tab-home',
  templateUrl: 'tab-home.page.html',
  styleUrls: ['tab-home.page.scss'],
  standalone: false,
})
export class TabHomePage implements OnInit, OnDestroy {
  counterLabel = '';
  isOnline = true;
  totalProducts = 0;
  totalStock = 0;
  totalTransactions = 0;
  todayRevenue = 0;
  pendingTransactionsCount = 0;
  lowStockProducts: Product[] = [];
  currentTime = '';

  private productsSub?: Subscription;
  private transactionsSub?: Subscription;
  private networkSub?: Subscription;
  private timeInterval: any;

  constructor(
    private productService: ProductService,
    private transactionService: TransactionService,
    private counterService: CounterService,
    private networkService: NetworkService,
    private syncService: SyncService,
    private offlineStorage: OfflineStorageService
  ) {}

  ngOnInit(): void {
    this.counterLabel = this.counterService.getCounterLabel();
    this.updateTime();
    this.timeInterval = setInterval(() => this.updateTime(), 60000);

    this.networkSub = this.networkService.isOnline$.subscribe(online => {
      this.isOnline = online;
    });

    this.productsSub = this.productService.getProducts().subscribe(products => {
      this.totalProducts = products.length;
      this.totalStock = products.reduce((sum, p) => sum + p.stock, 0);
      this.lowStockProducts = products.filter(p => p.stock <= 5 && p.stock > 0);
      // Cache products for offline use
      this.offlineStorage.cacheProducts(products);
    });

    this.transactionsSub = this.transactionService.getTransactions().subscribe(transactions => {
      this.totalTransactions = transactions.length;
      // Today's revenue
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStart = today.getTime();
      this.todayRevenue = transactions
        .filter(t => t.createdAt >= todayStart && t.status === 'synced')
        .reduce((sum, t) => sum + t.total, 0);
    });

    this.loadPendingCount();
  }

  async loadPendingCount(): Promise<void> {
    const pending = await this.offlineStorage.getPendingTransactions();
    this.pendingTransactionsCount = pending.filter(t => t.status === 'pending').length;
  }

  async syncNow(): Promise<void> {
    await this.syncService.syncPendingTransactions();
    await this.loadPendingCount();
  }

  ngOnDestroy(): void {
    this.productsSub?.unsubscribe();
    this.transactionsSub?.unsubscribe();
    this.networkSub?.unsubscribe();
    if (this.timeInterval) clearInterval(this.timeInterval);
  }

  private updateTime(): void {
    const now = new Date();
    this.currentTime = now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) +
      ' · ' + now.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  }
}
