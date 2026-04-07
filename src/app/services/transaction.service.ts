import { Injectable } from '@angular/core';
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
  private collectionName = 'transactions';

  constructor(
    private firestore: Firestore,
    private counterService: CounterService
  ) {}

  getTransactions(): Observable<Transaction[]> {
    const transactionsRef = collection(this.firestore, this.collectionName);
    const q = query(transactionsRef, orderBy('createdAt', 'desc'));
    return collectionData(q, { idField: 'id' }) as Observable<Transaction[]>;
  }

  async checkout(cartItems: CartItem[]): Promise<Transaction> {
    const counterId = this.counterService.getCounterId();
    const batch = writeBatch(this.firestore);

    const transactionItems: TransactionItem[] = cartItems.map(item => ({
      productId: item.product.id,
      productName: item.product.name,
      quantity: item.quantity,
      price: item.product.price
    }));

    const total = cartItems.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0
    );

    const transaction: Omit<Transaction, 'id'> = {
      items: transactionItems,
      total,
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
    const transactionsRef = collection(this.firestore, this.collectionName);
    const transactionDoc = doc(transactionsRef);
    batch.set(transactionDoc, transaction);

    await batch.commit();

    return { ...transaction, id: transactionDoc.id };
  }

  async updateTransactionStatus(id: string, status: 'pending' | 'synced' | 'failed'): Promise<void> {
    const transRef = doc(this.firestore, this.collectionName, id);
    await updateDoc(transRef, { status });
  }
}
