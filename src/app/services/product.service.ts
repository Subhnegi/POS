import { Injectable } from '@angular/core';
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
  private collectionName = 'products';

  constructor(private firestore: Firestore) {}

  getProducts(): Observable<Product[]> {
    const productsRef = collection(this.firestore, this.collectionName);
    return collectionData(productsRef, { idField: 'id' }) as Observable<Product[]>;
  }

  async addProduct(product: Omit<Product, 'id'>): Promise<string> {
    const productsRef = collection(this.firestore, this.collectionName);
    const docRef = await addDoc(productsRef, product);
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
    const productRef = doc(this.firestore, this.collectionName, id);
    return docData(productRef, { idField: 'id' }) as Observable<Product>;
  }
}
