import { Injectable, inject, Injector, runInInjectionContext } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  docData
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Product } from '../models/product.model';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private firestore = inject(Firestore);
  private injector = inject(Injector);
  private collectionName = 'products';
  private productsRef = collection(this.firestore, this.collectionName);
  private products$ = collectionData(this.productsRef, { idField: 'id' }) as Observable<Product[]>;

  getProducts(): Observable<Product[]> {
    return this.products$;
  }

  async addProduct(product: Omit<Product, 'id'>): Promise<string> {
    const docRef = await addDoc(this.productsRef, product);
    return docRef.id;
  }

  async updateProduct(id: string, data: Partial<Product>): Promise<void> {
    const productRef = doc(this.firestore, this.collectionName, id);
    await updateDoc(productRef, data);
  }

  async deleteProduct(id: string): Promise<void> {
    const productRef = doc(this.firestore, this.collectionName, id);
    await deleteDoc(productRef);
  }

  getProduct(id: string): Observable<Product> {
    return runInInjectionContext(this.injector, () => {
      const productRef = doc(this.firestore, this.collectionName, id);
      return docData(productRef, { idField: 'id' }) as Observable<Product>;
    });
  }
}
