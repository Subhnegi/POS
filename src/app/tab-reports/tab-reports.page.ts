import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { ProductService } from '../services/product.service';
import { TransactionService } from '../services/transaction.service';
import { ChartService } from '../services/chart.service';
import { Product } from '../models/product.model';
import { Transaction } from '../models/transaction.model';

type Period = 'day' | 'week' | 'month' | 'year';
type ReportTab = 'sales' | 'stock' | 'transactions' | 'profit' | 'popular';

@Component({
  selector: 'app-tab-reports',
  templateUrl: 'tab-reports.page.html',
  styleUrls: ['tab-reports.page.scss'],
  standalone: false,
})
export class TabReportsPage implements OnInit, OnDestroy, AfterViewInit {
  activeTab: ReportTab = 'sales';
  activePeriod: Period = 'week';

  products: Product[] = [];
  transactions: Transaction[] = [];

  // Sales KPIs
  totalSalesAmount = 0;
  totalOrders = 0;
  avgOrderValue = 0;

  // Stock KPIs
  totalStockValue = 0;
  totalStockUnits = 0;
  lowStockCount = 0;
  outOfStockCount = 0;

  // Transactions KPIs
  totalTxCount = 0;
  avgTxPerDay = 0;
  paymentBreakdown: { method: string; count: number; total: number }[] = [];

  // Profit KPIs
  totalRevenue = 0;
  totalCost = 0;
  totalProfit = 0;
  profitMargin = 0;
  totalDiscountGiven = 0;

  // Popular Products
  popularProducts: { name: string; category: string; unitsSold: number; revenue: number }[] = [];

  @ViewChild('salesChart') salesChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('stockBarChart') stockBarChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('stockDoughnutChart') stockDoughnutChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('txLineChart') txLineChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('paymentDoughnutChart') paymentDoughnutChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('profitChart') profitChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('popularChart') popularChartRef!: ElementRef<HTMLCanvasElement>;

  private productsSub?: Subscription;
  private transactionsSub?: Subscription;
  private viewReady = false;

  constructor(
    private productService: ProductService,
    private transactionService: TransactionService,
    private chartService: ChartService
  ) {}

  ngOnInit(): void {
    this.productsSub = this.productService.getProducts().subscribe(products => {
      this.products = products;
      this.refreshReports();
    });

    this.transactionsSub = this.transactionService.getTransactions().subscribe(transactions => {
      this.transactions = transactions.filter(t => t.status === 'synced');
      this.refreshReports();
    });
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    setTimeout(() => this.refreshReports(), 0);
  }

  ngOnDestroy(): void {
    this.productsSub?.unsubscribe();
    this.transactionsSub?.unsubscribe();
    this.chartService.destroyAll();
  }

  setTab(tab: ReportTab): void {
    this.activeTab = tab;
    setTimeout(() => this.refreshReports(), 0);
  }

  setPeriod(period: Period): void {
    this.activePeriod = period;
    this.refreshReports();
  }

  private refreshReports(): void {
    if (!this.viewReady) return;
    switch (this.activeTab) {
      case 'sales': this.buildSalesReport(); break;
      case 'stock': this.buildStockReport(); break;
      case 'transactions': this.buildTransactionsReport(); break;
      case 'profit': this.buildProfitReport(); break;
      case 'popular': this.buildPopularReport(); break;
    }
  }

  // ═══════ CHART HELPER ═══════
  private renderChart(key: string, canvas: ElementRef<HTMLCanvasElement> | undefined, config: any): void {
    if (!canvas?.nativeElement) return;
    this.chartService.render(key, canvas.nativeElement, config);
  }

  // ═══════ SALES REPORT ═══════
  private buildSalesReport(): void {
    const { labels, buckets } = this.getBuckets();
    const filtered = this.filterByPeriod();

    filtered.forEach(tx => {
      const idx = this.getBucketIndex(tx.createdAt, labels);
      if (idx >= 0) buckets[idx] += tx.total;
    });

    this.totalSalesAmount = filtered.reduce((s, t) => s + t.total, 0);
    this.totalOrders = filtered.length;
    this.avgOrderValue = this.totalOrders > 0 ? this.totalSalesAmount / this.totalOrders : 0;

    this.renderChart('sales', this.salesChartRef, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          data: buckets,
          label: 'Revenue',
          backgroundColor: 'rgba(245, 158, 11, 0.6)',
          borderColor: '#f59e0b',
          borderWidth: 2,
          borderRadius: 6,
        }]
      },
      options: this.getBarOptions('Revenue (₹)')
    });
  }

  // ═══════ STOCK REPORT ═══════
  private buildStockReport(): void {
    this.totalStockUnits = this.products.reduce((s, p) => s + p.stock, 0);
    this.totalStockValue = this.products.reduce((s, p) => s + (p.costPrice * p.stock), 0);
    this.lowStockCount = this.products.filter(p => p.stock > 0 && p.stock <= 5).length;
    this.outOfStockCount = this.products.filter(p => p.stock <= 0).length;

    const sorted = [...this.products]
      .sort((a, b) => (b.stock * b.costPrice) - (a.stock * a.costPrice))
      .slice(0, 10);

    this.renderChart('stockBar', this.stockBarChartRef, {
      type: 'bar',
      data: {
        labels: sorted.map(p => p.name.length > 12 ? p.name.substring(0, 12) + '…' : p.name),
        datasets: [{
          data: sorted.map(p => p.stock),
          label: 'Stock Units',
          backgroundColor: sorted.map(p =>
            p.stock <= 0 ? 'rgba(244, 63, 94, 0.6)' :
            p.stock <= 5 ? 'rgba(245, 158, 11, 0.6)' :
            'rgba(16, 185, 129, 0.6)'
          ),
          borderColor: sorted.map(p =>
            p.stock <= 0 ? '#f43f5e' :
            p.stock <= 5 ? '#f59e0b' :
            '#10b981'
          ),
          borderWidth: 2,
          borderRadius: 6,
        }]
      },
      options: this.getBarOptions('Units')
    });

    const healthy = this.products.filter(p => p.stock > 5).length;
    this.renderChart('stockDoughnut', this.stockDoughnutChartRef, {
      type: 'doughnut',
      data: {
        labels: ['Healthy (>5)', 'Low (1-5)', 'Out of Stock'],
        datasets: [{
          data: [healthy, this.lowStockCount, this.outOfStockCount],
          backgroundColor: [
            'rgba(16, 185, 129, 0.7)',
            'rgba(245, 158, 11, 0.7)',
            'rgba(244, 63, 94, 0.7)',
          ],
          borderColor: '#1c2333',
          borderWidth: 3,
        }]
      },
      options: this.getDoughnutOptions()
    });
  }

  // ═══════ TRANSACTIONS REPORT ═══════
  private buildTransactionsReport(): void {
    const { labels, buckets } = this.getBuckets();
    const filtered = this.filterByPeriod();

    filtered.forEach(tx => {
      const idx = this.getBucketIndex(tx.createdAt, labels);
      if (idx >= 0) buckets[idx]++;
    });

    this.totalTxCount = filtered.length;
    const dayCount = this.getPeriodDays();
    this.avgTxPerDay = dayCount > 0 ? this.totalTxCount / dayCount : 0;

    this.renderChart('txLine', this.txLineChartRef, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          data: buckets,
          label: 'Transactions',
          borderColor: '#38bdf8',
          backgroundColor: 'rgba(56, 189, 248, 0.15)',
          fill: true,
          tension: 0.35,
          pointBackgroundColor: '#38bdf8',
          pointBorderColor: '#1c2333',
          pointBorderWidth: 2,
          pointRadius: 4,
        }]
      },
      options: this.getLineOptions('Transactions')
    });

    const methodMap = new Map<string, { count: number; total: number }>();
    filtered.forEach(tx => {
      const m = tx.paymentMethod || 'Unknown';
      const entry = methodMap.get(m) || { count: 0, total: 0 };
      entry.count++;
      entry.total += tx.total;
      methodMap.set(m, entry);
    });
    this.paymentBreakdown = Array.from(methodMap.entries())
      .map(([method, data]) => ({ method, ...data }))
      .sort((a, b) => b.total - a.total);

    const payColors = ['#f59e0b', '#38bdf8', '#10b981', '#a78bfa', '#f43f5e'];
    this.renderChart('paymentDoughnut', this.paymentDoughnutChartRef, {
      type: 'doughnut',
      data: {
        labels: this.paymentBreakdown.map(p => p.method),
        datasets: [{
          data: this.paymentBreakdown.map(p => p.total),
          backgroundColor: this.paymentBreakdown.map((_, i) => payColors[i % payColors.length] + 'b3'),
          borderColor: '#1c2333',
          borderWidth: 3,
        }]
      },
      options: this.getDoughnutOptions()
    });
  }

  // ═══════ PROFIT REPORT ═══════
  private buildProfitReport(): void {
    const { labels, buckets } = this.getBuckets();
    const costBuckets = labels.map(() => 0);
    const revBuckets = labels.map(() => 0);
    const filtered = this.filterByPeriod();

    let totalRev = 0;
    let totalCost = 0;
    let totalDiscount = 0;

    filtered.forEach(tx => {
      const idx = this.getBucketIndex(tx.createdAt, labels);
      const rev = tx.total;
      const cost = tx.items.reduce((s, item) => s + (item.costPrice || 0) * item.quantity, 0);
      totalRev += rev;
      totalCost += cost;
      totalDiscount += tx.discountAmount || 0;
      if (idx >= 0) {
        revBuckets[idx] += rev;
        costBuckets[idx] += cost;
        buckets[idx] += (rev - cost);
      }
    });

    this.totalRevenue = totalRev;
    this.totalCost = totalCost;
    this.totalProfit = totalRev - totalCost;
    this.profitMargin = totalRev > 0 ? ((totalRev - totalCost) / totalRev) * 100 : 0;
    this.totalDiscountGiven = totalDiscount;

    this.renderChart('profit', this.profitChartRef, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            data: revBuckets,
            label: 'Revenue',
            backgroundColor: 'rgba(16, 185, 129, 0.5)',
            borderColor: '#10b981',
            borderWidth: 2,
            borderRadius: 6,
          },
          {
            data: costBuckets,
            label: 'Cost',
            backgroundColor: 'rgba(244, 63, 94, 0.5)',
            borderColor: '#f43f5e',
            borderWidth: 2,
            borderRadius: 6,
          },
          {
            data: buckets,
            label: 'Profit',
            backgroundColor: 'rgba(245, 158, 11, 0.5)',
            borderColor: '#f59e0b',
            borderWidth: 2,
            borderRadius: 6,
          }
        ]
      },
      options: this.getBarOptions('Amount (₹)')
    });
  }

  // ═══════ POPULAR PRODUCTS REPORT ═══════
  private buildPopularReport(): void {
    const filtered = this.filterByPeriod();
    const productMap = new Map<string, { name: string; category: string; unitsSold: number; revenue: number }>();

    filtered.forEach(tx => {
      tx.items.forEach(item => {
        const existing = productMap.get(item.productId) || {
          name: item.productName,
          category: (item as any).category || '',
          unitsSold: 0,
          revenue: 0
        };
        existing.unitsSold += item.quantity;
        existing.revenue += item.price * item.quantity;
        productMap.set(item.productId, existing);
      });
    });

    this.popularProducts = Array.from(productMap.values())
      .sort((a, b) => b.unitsSold - a.unitsSold)
      .slice(0, 10);

    const top = this.popularProducts.slice(0, 8);
    this.renderChart('popular', this.popularChartRef, {
      type: 'bar',
      data: {
        labels: top.map(p => p.name.length > 12 ? p.name.substring(0, 12) + '…' : p.name),
        datasets: [{
          data: top.map(p => p.unitsSold),
          label: 'Units Sold',
          backgroundColor: 'rgba(167, 139, 250, 0.6)',
          borderColor: '#a78bfa',
          borderWidth: 2,
          borderRadius: 6,
        }]
      },
      options: this.getBarOptions('Units Sold')
    });
  }

  // ═══════ EXPORT ═══════
  downloadCSV(): void {
    const filtered = this.filterByPeriod();
    const headers = ['Date', 'Transaction ID', 'Customer', 'Items', 'Subtotal', 'Discount', 'Total', 'Payment Method'];
    const rows = filtered.map(tx => [
      new Date(tx.createdAt).toLocaleString(),
      tx.id,
      tx.customerName || 'Walk-in',
      tx.items.map(i => `${i.productName} x${i.quantity}`).join('; '),
      tx.subtotal?.toFixed(2) || tx.total.toFixed(2),
      tx.discountAmount?.toFixed(2) || '0.00',
      tx.total.toFixed(2),
      tx.paymentMethod || 'cash'
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
    this.downloadFile(csv, `report-${this.activeTab}-${this.activePeriod}.csv`, 'text/csv');
  }

  downloadPDF(): void {
    const filtered = this.filterByPeriod();
    const html = this.buildReportHtml(filtered);
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
  }

  private buildReportHtml(transactions: Transaction[]): string {
    const itemsHtml = transactions.map(tx => `
      <tr>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;font-size:12px">${new Date(tx.createdAt).toLocaleDateString()}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;font-size:12px">${tx.customerName || 'Walk-in'}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;font-size:12px">${tx.items.length}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;font-size:12px;text-align:right">&#8377;${tx.total.toFixed(2)}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;font-size:12px">${tx.paymentMethod || 'cash'}</td>
      </tr>`).join('');

    const total = transactions.reduce((s, t) => s + t.total, 0);

    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Report - ${this.activeTab}</title>
<style>body{font-family:'Segoe UI',sans-serif;max-width:800px;margin:20px auto;color:#1a1a1a;padding:20px}
h1{font-size:20px;color:#f59e0b;margin-bottom:4px}table{width:100%;border-collapse:collapse;margin-top:16px}
th{font-size:11px;text-transform:uppercase;color:#888;text-align:left;padding:8px;border-bottom:2px solid #ddd}
.summary{margin-top:16px;font-size:14px;font-weight:600}
@media print{body{margin:0;padding:10px}}</style></head><body>
<h1>POS Terminal — ${this.activeTab.charAt(0).toUpperCase() + this.activeTab.slice(1)} Report</h1>
<p style="color:#888;font-size:13px">Period: ${this.activePeriod} · Generated: ${new Date().toLocaleString()}</p>
<table><thead><tr><th>Date</th><th>Customer</th><th>Items</th><th style="text-align:right">Total</th><th>Payment</th></tr></thead>
<tbody>${itemsHtml}</tbody></table>
<div class="summary">Total: &#8377;${total.toFixed(2)} · ${transactions.length} transactions</div>
</body></html>`;
  }

  private downloadFile(content: string, filename: string, type: string): void {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ═══════ PERIOD HELPERS ═══════
  private filterByPeriod(): Transaction[] {
    const now = Date.now();
    const cutoff = now - this.getPeriodMs();
    return this.transactions.filter(t => t.createdAt >= cutoff);
  }

  private getPeriodMs(): number {
    switch (this.activePeriod) {
      case 'day': return 24 * 60 * 60 * 1000;
      case 'week': return 7 * 24 * 60 * 60 * 1000;
      case 'month': return 30 * 24 * 60 * 60 * 1000;
      case 'year': return 365 * 24 * 60 * 60 * 1000;
    }
  }

  private getPeriodDays(): number {
    switch (this.activePeriod) {
      case 'day': return 1;
      case 'week': return 7;
      case 'month': return 30;
      case 'year': return 365;
    }
  }

  private getBuckets(): { labels: string[]; buckets: number[] } {
    const now = new Date();
    const labels: string[] = [];

    switch (this.activePeriod) {
      case 'day': {
        for (let h = 0; h < 24; h += 2) {
          labels.push(`${h.toString().padStart(2, '0')}:00`);
        }
        break;
      }
      case 'week': {
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        for (let d = 6; d >= 0; d--) {
          const dt = new Date(now);
          dt.setDate(dt.getDate() - d);
          labels.push(dayNames[dt.getDay()]);
        }
        break;
      }
      case 'month': {
        for (let d = 29; d >= 0; d--) {
          const dt = new Date(now);
          dt.setDate(dt.getDate() - d);
          labels.push(`${dt.getDate()}/${dt.getMonth() + 1}`);
        }
        break;
      }
      case 'year': {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        for (let m = 11; m >= 0; m--) {
          const dt = new Date(now);
          dt.setMonth(dt.getMonth() - m);
          labels.push(monthNames[dt.getMonth()]);
        }
        break;
      }
    }

    return { labels, buckets: labels.map(() => 0) };
  }

  private getBucketIndex(timestamp: number, labels: string[]): number {
    const now = new Date();
    const dt = new Date(timestamp);

    switch (this.activePeriod) {
      case 'day': {
        const hour = dt.getHours();
        return Math.floor(hour / 2);
      }
      case 'week': {
        const diffDays = Math.floor((now.getTime() - dt.getTime()) / (24 * 60 * 60 * 1000));
        return 6 - diffDays;
      }
      case 'month': {
        const diffDays = Math.floor((now.getTime() - dt.getTime()) / (24 * 60 * 60 * 1000));
        return 29 - diffDays;
      }
      case 'year': {
        const diffMonths = (now.getFullYear() - dt.getFullYear()) * 12 + (now.getMonth() - dt.getMonth());
        return 11 - diffMonths;
      }
    }
  }

  // ═══════ CHART OPTIONS ═══════
  private getBarOptions(yLabel: string): any {
    return this.chartService.getBarOptions(yLabel);
  }

  private getLineOptions(yLabel: string): any {
    return this.chartService.getLineOptions(yLabel);
  }

  private getDoughnutOptions(): any {
    return this.chartService.getDoughnutOptions();
  }
}
