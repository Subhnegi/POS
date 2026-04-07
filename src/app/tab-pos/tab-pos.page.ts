import { Component, OnInit, OnDestroy } from '@angular/core';
import { ToastController, LoadingController, AlertController } from '@ionic/angular';
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
  showCart = false;

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
    private loadingController: LoadingController,
    private alertController: AlertController
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
      // Cache for offline
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

  addToCart(product: Product): void {
    if (product.stock <= 0) {
      this.showToast('Product is out of stock', 'warning');
      return;
    }
    this.cartService.addToCart(product);
    this.showToast(`${product.name} added to cart`, 'success');
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

  toggleCart(): void {
    this.showCart = !this.showCart;
  }

  async checkout(): Promise<void> {
    if (this.cartItems.length === 0) {
      await this.showToast('Cart is empty', 'warning');
      return;
    }

    const alert = await this.alertController.create({
      header: 'Confirm Checkout',
      message: `Total: ₹${this.getCartTotal().toFixed(2)}<br>Proceed with checkout?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Confirm',
          handler: () => this.processCheckout()
        }
      ]
    });
    await alert.present();
  }

  private async processCheckout(): Promise<void> {
    const loading = await this.loadingController.create({ message: 'Processing...' });
    await loading.present();

    try {
      if (this.isOnline) {
        // Online checkout - straight to Firestore
        await this.transactionService.checkout(this.cartItems);
        await this.showToast('Transaction completed!', 'success');
      } else {
        // Offline checkout - save locally
        const transaction: Transaction = {
          id: this.generateOfflineId(),
          items: this.cartItems.map(item => ({
            productId: item.product.id,
            productName: item.product.name,
            quantity: item.quantity,
            price: item.product.price
          })),
          total: this.getCartTotal(),
          counterId: this.counterService.getCounterId(),
          status: 'pending',
          createdAt: Date.now()
        };
        await this.offlineStorage.savePendingTransaction(transaction);
        await this.showToast('Transaction saved offline. Will sync when online.', 'warning');
      }

      this.cartService.clearCart();
      this.showCart = false;
    } catch (error) {
      console.error('Checkout error:', error);
      await this.showToast('Error processing transaction', 'danger');
    } finally {
      await loading.dismiss();
    }
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
