import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  addDoc,
  updateDoc,
  deleteDoc
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Customer } from '../models/customer.model';

@Injectable({ providedIn: 'root' })
export class CustomerService {
  private firestore = inject(Firestore);
  private collectionName = 'customers';
  private customersRef = collection(this.firestore, this.collectionName);
  private customers$ = collectionData(this.customersRef, { idField: 'id' }) as Observable<Customer[]>;

  getCustomers(): Observable<Customer[]> {
    return this.customers$;
  }

  async addCustomer(customer: Omit<Customer, 'id'>): Promise<string> {
    const docRef = await addDoc(this.customersRef, customer);
    return docRef.id;
  }

  async updateCustomer(id: string, data: Partial<Customer>): Promise<void> {
    const ref = doc(this.firestore, this.collectionName, id);
    await updateDoc(ref, data);
  }

  async deleteCustomer(id: string): Promise<void> {
    const ref = doc(this.firestore, this.collectionName, id);
    await deleteDoc(ref);
  }
}
