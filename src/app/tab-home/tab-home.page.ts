import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { ProductService } from '../services/product.service';
import { TransactionService } from '../services/transaction.service';
import { CounterService } from '../services/counter.service';
import { NetworkService } from '../services/network.service';
import { SyncService } from '../services/sync.service';
import { OfflineStorageService } from '../services/offline-storage.service';
import { ThemeService } from '../services/theme.service';
import { ChartService } from '../services/chart.service';
import { Product } from '../models/product.model';
import { Transaction } from '../models/transaction.model';

@Component({
  selector: 'app-tab-home',
  templateUrl: 'tab-home.page.html',
  styleUrls: ['tab-home.page.scss'],
  standalone: false,
})
export class TabHomePage implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('revenueChart') revenueChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('categoryChart') categoryChartRef!: ElementRef<HTMLCanvasElement>;

  counterLabel = '';
  isOnline = true;
  totalProducts = 0;
  totalStock = 0;
  totalTransactions = 0;
  todayRevenue = 0;
  todayOrders = 0;
  avgOrderValue = 0;
  todayProfit = 0;
  topSellingProduct = '';
  pendingTransactionsCount = 0;
  lowStockProducts: Product[] = [];
  currentTime = '';

  private allTransactions: Transaction[] = [];
  private chartsReady = false;

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
    private offlineStorage: OfflineStorageService,
    public themeService: ThemeService,
    private chartService: ChartService
  ) {}

  toggleTheme(): void {
    this.themeService.toggle();
  }

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
      this.allTransactions = transactions;
      // Today's stats
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStart = today.getTime();
      const todayTxs = transactions.filter(t => t.createdAt >= todayStart && t.status === 'synced');
      this.todayRevenue = todayTxs.reduce((sum, t) => sum + t.total, 0);
      this.todayOrders = todayTxs.length;
      this.avgOrderValue = this.todayOrders > 0 ? this.todayRevenue / this.todayOrders : 0;
      this.todayProfit = todayTxs.reduce((sum, t) => {
        const cost = t.items.reduce((s, item) => s + (item.costPrice || 0) * item.quantity, 0);
        return sum + (t.total - cost);
      }, 0);

      // Top selling product
      const productSales = new Map<string, number>();
      todayTxs.forEach(t => t.items.forEach(i => {
        productSales.set(i.productName, (productSales.get(i.productName) || 0) + i.quantity);
      }));
      let maxSales = 0;
      this.topSellingProduct = '-';
      productSales.forEach((qty, name) => {
        if (qty > maxSales) { maxSales = qty; this.topSellingProduct = name; }
      });

      if (this.chartsReady) this.renderCharts();
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

  ngAfterViewInit(): void {
    this.chartsReady = true;
    if (this.allTransactions.length) this.renderCharts();
  }

  private async renderCharts(): Promise<void> {
    const synced = this.allTransactions.filter(t => t.status === 'synced');

    // ── Revenue chart: last 7 days ──
    if (this.revenueChartRef?.nativeElement) {
      const labels: string[] = [];
      const revenue: number[] = [];
      const profit: number[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        d.setHours(0, 0, 0, 0);
        const start = d.getTime();
        const end = start + 86400000;
        labels.push(d.toLocaleDateString(undefined, { weekday: 'short' }));
        const dayTxs = synced.filter(t => t.createdAt >= start && t.createdAt < end);
        revenue.push(dayTxs.reduce((s, t) => s + t.total, 0));
        profit.push(dayTxs.reduce((s, t) => {
          const cost = t.items.reduce((c, i) => c + (i.costPrice || 0) * i.quantity, 0);
          return s + (t.total - cost);
        }, 0));
      }
      await this.chartService.render('dashRevenue', this.revenueChartRef.nativeElement, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            { label: 'Revenue', data: revenue, backgroundColor: 'rgba(16,185,129,0.6)', borderRadius: 6 },
            { label: 'Profit', data: profit, backgroundColor: 'rgba(245,158,11,0.6)', borderRadius: 6 }
          ]
        },
        options: this.chartService.getBarOptions('Amount (₹)')
      });
    }

    // ── Category doughnut ──
    if (this.categoryChartRef?.nativeElement) {
      const catMap = new Map<string, number>();
      synced.forEach(t => t.items.forEach(i => {
        const cat = i.category || 'Uncategorized';
        catMap.set(cat, (catMap.get(cat) || 0) + i.price * i.quantity);
      }));
      const colors = ['#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899'];
      await this.chartService.render('dashCategory', this.categoryChartRef.nativeElement, {
        type: 'doughnut',
        data: {
          labels: [...catMap.keys()],
          datasets: [{
            data: [...catMap.values()],
            backgroundColor: colors.slice(0, catMap.size),
            borderWidth: 0
          }]
        },
        options: this.chartService.getDoughnutOptions()
      });
    }
  }

  ngOnDestroy(): void {
    this.productsSub?.unsubscribe();
    this.transactionsSub?.unsubscribe();
    this.networkSub?.unsubscribe();
    this.chartService.destroyAll();
    if (this.timeInterval) clearInterval(this.timeInterval);
  }

  private updateTime(): void {
    const now = new Date();
    this.currentTime = now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) +
      ' · ' + now.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  }
}
