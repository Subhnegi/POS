import { Component, OnInit, OnDestroy } from '@angular/core';
import { ToastController, LoadingController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { ProductService } from '../services/product.service';
import { CartService } from '../services/cart.service';
import { TransactionService } from '../services/transaction.service';
import { NetworkService } from '../services/network.service';
import { OfflineStorageService } from '../services/offline-storage.service';
import { CounterService } from '../services/counter.service';
import { Product } from '../models/product.model';
import { CartItem } from '../models/cart-item.model';
import { Transaction } from '../models/transaction.model';

@Component({
  selector: 'app-tab-pos',
  templateUrl: 'tab-pos.page.html',
  styleUrls: ['tab-pos.page.scss'],
  standalone: false,
})
export class TabPosPage implements OnInit, OnDestroy {
  products: Product[] = [];
  filteredProducts: Product[] = [];
  cartItems: CartItem[] = [];
  searchTerm = '';
  isLoading = true;
  isOnline = true;

  // Drag & Drop
  isDragging = false;
  isDragOverCart = false;
  private draggedProduct: Product | null = null;

  // Checkout
  showCheckoutModal = false;
  showSuccessModal = false;
  isProcessing = false;
  lastTransaction: Transaction | null = null;
  checkoutSubtotal = 0;
  checkoutDiscount = 0;
  checkoutGrandTotal = 0;

  checkoutData = {
    customerName: '',
    customerPhone: '',
    offerCode: '',
    discountPercent: 0,
    paymentMethod: 'cash'
  };

  paymentMethods = [
    { value: 'cash', label: 'Cash', icon: 'cash-outline' },
    { value: 'card', label: 'Card', icon: 'card-outline' },
    { value: 'upi', label: 'UPI', icon: 'phone-portrait-outline' }
  ];

  private productsSub?: Subscription;
  private cartSub?: Subscription;
  private networkSub?: Subscription;

  constructor(
    private productService: ProductService,
    private cartService: CartService,
    private transactionService: TransactionService,
    private networkService: NetworkService,
    private offlineStorage: OfflineStorageService,
    private counterService: CounterService,
    private toastController: ToastController,
    private loadingController: LoadingController
  ) {}

  ngOnInit(): void {
    this.networkSub = this.networkService.isOnline$.subscribe(online => {
      this.isOnline = online;
      if (!online) {
        this.loadOfflineProducts();
      }
    });

    this.productsSub = this.productService.getProducts().subscribe(products => {
      this.products = products;
      this.filterProducts();
      this.isLoading = false;
      this.offlineStorage.cacheProducts(products);
    });

    this.cartSub = this.cartService.cartItems$.subscribe(items => {
      this.cartItems = items;
    });
  }

  private async loadOfflineProducts(): Promise<void> {
    const cached = await this.offlineStorage.getCachedProducts();
    if (cached.length > 0) {
      this.products = cached;
      this.filterProducts();
      this.isLoading = false;
    }
  }

  filterProducts(): void {
    if (!this.searchTerm.trim()) {
      this.filteredProducts = [...this.products];
    } else {
      const term = this.searchTerm.toLowerCase();
      this.filteredProducts = this.products.filter(p =>
        p.name.toLowerCase().includes(term)
      );
    }
  }

  // ── Cart Operations ──

  addToCart(product: Product): void {
    if (product.stock <= 0) {
      this.showToast('Out of stock', 'warning');
      return;
    }
    this.cartService.addToCart(product);
  }

  removeFromCart(productId: string): void {
    this.cartService.removeFromCart(productId);
  }

  incrementQty(productId: string): void {
    this.cartService.incrementQuantity(productId);
  }

  decrementQty(productId: string): void {
    this.cartService.decrementQuantity(productId);
  }

  getCartTotal(): number {
    return this.cartService.getTotal();
  }

  getCartItemCount(): number {
    return this.cartService.getItemCount();
  }

  clearCart(): void {
    this.cartService.clearCart();
  }

  // ── Drag & Drop ──

  onDragStart(event: DragEvent, product: Product): void {
    if (product.stock <= 0) {
      event.preventDefault();
      return;
    }
    this.draggedProduct = product;
    this.isDragging = true;
    event.dataTransfer?.setData('text/plain', product.id);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'copy';
    }
  }

  onDragEnd(event: DragEvent): void {
    this.isDragging = false;
    this.isDragOverCart = false;
    this.draggedProduct = null;
  }

  onCartDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOverCart = true;
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
    }
  }

  onCartDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragOverCart = false;
  }

  onCartDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOverCart = false;
    this.isDragging = false;

    if (this.draggedProduct) {
      this.addToCart(this.draggedProduct);
      this.draggedProduct = null;
    }
  }

  // ── Checkout ──

  openCheckout(): void {
    if (this.cartItems.length === 0) {
      this.showToast('Cart is empty', 'warning');
      return;
    }
    this.checkoutData = {
      customerName: '',
      customerPhone: '',
      offerCode: '',
      discountPercent: 0,
      paymentMethod: 'cash'
    };
    this.recalcCheckout();
    this.showCheckoutModal = true;
  }

  closeCheckout(): void {
    this.showCheckoutModal = false;
  }

  applyOfferCode(): void {
    const code = this.checkoutData.offerCode.trim().toUpperCase();
    if (code === 'SAVE10') {
      this.checkoutData.discountPercent = 10;
    } else if (code === 'SAVE20') {
      this.checkoutData.discountPercent = 20;
    } else if (code === 'HALF') {
      this.checkoutData.discountPercent = 50;
    }
    this.recalcCheckout();
  }

  recalcCheckout(): void {
    this.checkoutSubtotal = this.getCartTotal();
    const pct = Math.min(Math.max(this.checkoutData.discountPercent || 0, 0), 100);
    this.checkoutDiscount = Math.round(this.checkoutSubtotal * pct) / 100;
    this.checkoutGrandTotal = this.checkoutSubtotal - this.checkoutDiscount;
  }

  async processPayment(): Promise<void> {
    this.isProcessing = true;

    // Simulate payment gateway delay
    await new Promise<void>(resolve => setTimeout(resolve, 1800));

    try {
      if (this.isOnline) {
        const tx = await this.transactionService.checkout(this.cartItems, {
          customerName: this.checkoutData.customerName || 'Walk-in Customer',
          customerPhone: this.checkoutData.customerPhone,
          offerCode: this.checkoutData.offerCode,
          discountPercent: this.checkoutData.discountPercent,
          paymentMethod: this.checkoutData.paymentMethod
        });
        this.lastTransaction = tx;
      } else {
        const offlineTx: Transaction = {
          id: this.generateOfflineId(),
          items: this.cartItems.map(item => ({
            productId: item.product.id,
            productName: item.product.name,
            quantity: item.quantity,
            price: item.product.sellingPrice,
            costPrice: item.product.costPrice
          })),
          subtotal: this.checkoutSubtotal,
          discountPercent: this.checkoutData.discountPercent,
          discountAmount: this.checkoutDiscount,
          total: this.checkoutGrandTotal,
          customerName: this.checkoutData.customerName || 'Walk-in Customer',
          customerPhone: this.checkoutData.customerPhone,
          offerCode: this.checkoutData.offerCode,
          paymentMethod: this.checkoutData.paymentMethod,
          counterId: this.counterService.getCounterId(),
          status: 'pending',
          createdAt: Date.now()
        };
        await this.offlineStorage.savePendingTransaction(offlineTx);
        this.lastTransaction = offlineTx;
      }

      this.cartService.clearCart();
      this.showCheckoutModal = false;
      this.showSuccessModal = true;
    } catch (error) {
      console.error('Payment error:', error);
      await this.showToast('Payment failed. Please try again.', 'danger');
    } finally {
      this.isProcessing = false;
    }
  }

  closeSuccess(): void {
    this.showSuccessModal = false;
    this.lastTransaction = null;
  }

  private generateOfflineId(): string {
    return 'offline_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
  }

  private async showToast(message: string, color: string): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color,
      position: 'top'
    });
    await toast.present();
  }

  ngOnDestroy(): void {
    this.productsSub?.unsubscribe();
    this.cartSub?.unsubscribe();
    this.networkSub?.unsubscribe();
  }
}
