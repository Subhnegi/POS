import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  addDoc,
  doc,
  updateDoc,
  writeBatch,
  query,
  orderBy
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Transaction, TransactionItem } from '../models/transaction.model';
import { CartItem } from '../models/cart-item.model';
import { CounterService } from './counter.service';

@Injectable({
  providedIn: 'root'
})
export class TransactionService {
  private firestore = inject(Firestore);
  private counterService = inject(CounterService);
  private collectionName = 'transactions';
  private transactionsRef = collection(this.firestore, this.collectionName);
  private transactionsQuery = query(this.transactionsRef, orderBy('createdAt', 'desc'));
  private transactions$ = collectionData(this.transactionsQuery, { idField: 'id' }) as Observable<Transaction[]>;

  getTransactions(): Observable<Transaction[]> {
    return this.transactions$;
  }

  async checkout(cartItems: CartItem[], checkoutData: {
    customerName: string;
    customerPhone: string;
    offerCode: string;
    discountPercent: number;
    paymentMethod: string;
  }): Promise<Transaction> {
    const counterId = this.counterService.getCounterId();
    const batch = writeBatch(this.firestore);

    const transactionItems: TransactionItem[] = cartItems.map(item => ({
      productId: item.product.id,
      productName: item.product.name,
      quantity: item.quantity,
      price: item.product.sellingPrice,
      costPrice: item.product.costPrice
    }));

    const subtotal = cartItems.reduce(
      (sum, item) => sum + item.product.sellingPrice * item.quantity,
      0
    );

    const discountAmount = Math.round(subtotal * checkoutData.discountPercent) / 100;
    const total = subtotal - discountAmount;

    const transaction: Omit<Transaction, 'id'> = {
      items: transactionItems,
      subtotal,
      discountPercent: checkoutData.discountPercent,
      discountAmount,
      total,
      customerName: checkoutData.customerName,
      customerPhone: checkoutData.customerPhone,
      offerCode: checkoutData.offerCode,
      paymentMethod: checkoutData.paymentMethod,
      counterId,
      status: 'synced',
      createdAt: Date.now()
    };

    // Deduct stock for each product
    cartItems.forEach(item => {
      const productRef = doc(this.firestore, 'products', item.product.id);
      const newStock = item.product.stock - item.quantity;
      batch.update(productRef, { stock: newStock >= 0 ? newStock : 0 });
    });

    // Add transaction
    const transactionDoc = doc(this.transactionsRef);
    batch.set(transactionDoc, transaction);

    await batch.commit();

    return { ...transaction, id: transactionDoc.id };
  }

  async updateTransactionStatus(id: string, status: 'pending' | 'synced' | 'failed'): Promise<void> {
    const transRef = doc(this.firestore, this.collectionName, id);
    await updateDoc(transRef, { status });
  }
}
