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
  filteredTransactions: Transaction[] = [];
  pendingTransactions: Transaction[] = [];
  isLoading = true;
  expandedId: string | null = null;

  // Filters
  searchTerm = '';
  filterPayment = '';
  filterDateRange: 'all' | 'today' | 'week' | 'month' = 'all';

  private transactionsSub?: Subscription;

  constructor(
    private transactionService: TransactionService,
    private offlineStorage: OfflineStorageService
  ) {}

  ngOnInit(): void {
    this.transactionsSub = this.transactionService.getTransactions().subscribe(transactions => {
      this.transactions = transactions;
      this.applyFilters();
      this.isLoading = false;
    });

    this.loadPendingTransactions();
  }

  applyFilters(): void {
    let result = [...this.transactions];

    // Date range filter
    if (this.filterDateRange !== 'all') {
      const now = Date.now();
      let cutoff = 0;
      switch (this.filterDateRange) {
        case 'today': cutoff = now - 24 * 60 * 60 * 1000; break;
        case 'week': cutoff = now - 7 * 24 * 60 * 60 * 1000; break;
        case 'month': cutoff = now - 30 * 24 * 60 * 60 * 1000; break;
      }
      result = result.filter(t => t.createdAt >= cutoff);
    }

    // Payment method filter
    if (this.filterPayment) {
      result = result.filter(t => t.paymentMethod === this.filterPayment);
    }

    // Search filter
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      result = result.filter(t =>
        t.customerName?.toLowerCase().includes(term) ||
        t.id.toLowerCase().includes(term) ||
        t.items.some(i => i.productName.toLowerCase().includes(term))
      );
    }

    this.filteredTransactions = result;
  }

  async loadPendingTransactions(): Promise<void> {
    this.pendingTransactions = await this.offlineStorage.getPendingTransactions();
  }

  toggleExpand(id: string): void {
    this.expandedId = this.expandedId === id ? null : id;
  }

  formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleString();
  }

  // ── Receipt Generation ──

  private buildReceiptHtml(tx: Transaction): string {
    const itemsHtml = tx.items.map(item => `
      <tr>
        <td style="padding:6px 0;border-bottom:1px solid #eee">${this.escapeHtml(item.productName)}</td>
        <td style="padding:6px 0;border-bottom:1px solid #eee;text-align:center">${item.quantity}</td>
        <td style="padding:6px 0;border-bottom:1px solid #eee;text-align:right">&#8377;${item.price.toFixed(2)}</td>
        <td style="padding:6px 0;border-bottom:1px solid #eee;text-align:right">&#8377;${(item.price * item.quantity).toFixed(2)}</td>
      </tr>`).join('');

    const subtotal = tx.subtotal || tx.total;
    const discountRow = tx.discountAmount && tx.discountAmount > 0
      ? `<tr><td colspan="3" style="text-align:right;padding:4px 0">Discount (${tx.discountPercent}%)</td><td style="text-align:right;padding:4px 0;color:#10b981">-&#8377;${tx.discountAmount.toFixed(2)}</td></tr>` : '';
    const offerRow = tx.offerCode
      ? `<tr><td colspan="3" style="text-align:right;padding:4px 0">Offer Code</td><td style="text-align:right;padding:4px 0">${this.escapeHtml(tx.offerCode)}</td></tr>` : '';

    return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Receipt - ${tx.id}</title>
<style>
  body{font-family:'Segoe UI',system-ui,sans-serif;max-width:400px;margin:20px auto;color:#1a1a1a;padding:20px}
  .logo{text-align:center;font-size:22px;font-weight:700;color:#f59e0b;margin-bottom:4px}
  .meta{text-align:center;font-size:12px;color:#888;margin-bottom:16px}
  .divider{border-top:1px dashed #ddd;margin:12px 0}
  table{width:100%;border-collapse:collapse}
  th{font-size:10px;text-transform:uppercase;color:#888;text-align:left;padding:6px 0;border-bottom:2px solid #eee}
  th:nth-child(2){text-align:center}
  th:nth-child(3),th:nth-child(4){text-align:right}
  .total-row td{font-weight:700;font-size:16px;padding-top:8px;border-top:2px solid #333}
  .footer{text-align:center;margin-top:20px;font-size:12px;color:#888}
  .thank{color:#f59e0b;font-weight:600;font-size:14px;margin-top:8px}
</style></head><body>
<div class="logo">POS Terminal</div>
<div class="meta">${new Date(tx.createdAt).toLocaleString()}<br>${tx.id}</div>
${tx.customerName ? `<div style="font-size:13px;margin-bottom:4px">Customer: ${this.escapeHtml(tx.customerName)}</div>` : ''}
${tx.customerPhone ? `<div style="font-size:13px;margin-bottom:8px">Phone: ${this.escapeHtml(tx.customerPhone)}</div>` : ''}
<div class="divider"></div>
<table>
  <thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead>
  <tbody>${itemsHtml}</tbody>
</table>
<div class="divider"></div>
<table>
  <tr><td colspan="3" style="text-align:right;padding:4px 0">Subtotal</td><td style="text-align:right;padding:4px 0">&#8377;${subtotal.toFixed(2)}</td></tr>
  ${discountRow}
  ${offerRow}
  <tr class="total-row"><td colspan="3" style="text-align:right">Total</td><td style="text-align:right">&#8377;${tx.total.toFixed(2)}</td></tr>
</table>
<div class="divider"></div>
<div class="footer">
  Payment: ${this.escapeHtml(tx.paymentMethod || 'Cash')}<br>
  Counter: ${this.escapeHtml(tx.counterId.substring(0, 8))}<br>
  <div class="thank">Thank you for your purchase!</div>
</div>
</body></html>`;
  }

  private escapeHtml(str: string): string {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  downloadReceipt(tx: Transaction): void {
    const html = this.buildReceiptHtml(tx);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt-${tx.id.substring(0, 8)}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  printReceipt(tx: Transaction): void {
    const html = this.buildReceiptHtml(tx);
    const printWindow = window.open('', '_blank', 'width=450,height=600');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
  }

  ngOnDestroy(): void {
    this.transactionsSub?.unsubscribe();
  }
}
