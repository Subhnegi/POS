import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { CartItem } from '../models/cart-item.model';
import { Product } from '../models/product.model';

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private cartItems = new BehaviorSubject<CartItem[]>([]);
  cartItems$ = this.cartItems.asObservable();

  constructor() {}

  getItems(): CartItem[] {
    return this.cartItems.getValue();
  }

  addToCart(product: Product): void {
    const items = this.getItems();
    const existingItem = items.find(item => item.product.id === product.id);

    if (existingItem) {
      if (existingItem.quantity < product.stock) {
        existingItem.quantity++;
        this.cartItems.next([...items]);
      }
    } else {
      if (product.stock > 0) {
        this.cartItems.next([...items, { product, quantity: 1 }]);
      }
    }
  }

  removeFromCart(productId: string): void {
    const items = this.getItems().filter(item => item.product.id !== productId);
    this.cartItems.next(items);
  }

  updateQuantity(productId: string, quantity: number): void {
    const items = this.getItems();
    const item = items.find(i => i.product.id === productId);
    if (item) {
      if (quantity <= 0) {
        this.removeFromCart(productId);
      } else if (quantity <= item.product.stock) {
        item.quantity = quantity;
        this.cartItems.next([...items]);
      }
    }
  }

  incrementQuantity(productId: string): void {
    const items = this.getItems();
    const item = items.find(i => i.product.id === productId);
    if (item && item.quantity < item.product.stock) {
      item.quantity++;
      this.cartItems.next([...items]);
    }
  }

  decrementQuantity(productId: string): void {
    const items = this.getItems();
    const item = items.find(i => i.product.id === productId);
    if (item) {
      if (item.quantity <= 1) {
        this.removeFromCart(productId);
      } else {
        item.quantity--;
        this.cartItems.next([...items]);
      }
    }
  }

  getTotal(): number {
    return this.getItems().reduce(
      (total, item) => total + item.product.price * item.quantity,
      0
    );
  }

  getItemCount(): number {
    return this.getItems().reduce((count, item) => count + item.quantity, 0);
  }

  clearCart(): void {
    this.cartItems.next([]);
  }
}
