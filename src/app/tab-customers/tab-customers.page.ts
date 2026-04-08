import { Component, OnInit, OnDestroy } from '@angular/core';
import { AlertController, ToastController, LoadingController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { CustomerService } from '../services/customer.service';
import { Customer } from '../models/customer.model';

@Component({
  selector: 'app-tab-customers',
  templateUrl: 'tab-customers.page.html',
  styleUrls: ['tab-customers.page.scss'],
  standalone: false,
})
export class TabCustomersPage implements OnInit, OnDestroy {
  customers: Customer[] = [];
  filteredCustomers: Customer[] = [];
  searchTerm = '';
  isLoading = true;
  private customersSub?: Subscription;

  // Add/Edit form
  showForm = false;
  isEditing = false;
  editingCustomerId = '';
  formCustomer = { name: '', phone: '', email: '', address: '', notes: '' };

  constructor(
    private customerService: CustomerService,
    private alertController: AlertController,
    private toastController: ToastController,
    private loadingController: LoadingController
  ) {}

  ngOnInit(): void {
    this.customersSub = this.customerService.getCustomers().subscribe(customers => {
      this.customers = customers;
      this.filterCustomers();
      this.isLoading = false;
    });
  }

  filterCustomers(): void {
    if (!this.searchTerm.trim()) {
      this.filteredCustomers = [...this.customers];
    } else {
      const term = this.searchTerm.toLowerCase();
      this.filteredCustomers = this.customers.filter(c =>
        c.name.toLowerCase().includes(term) ||
        c.phone.toLowerCase().includes(term) ||
        c.email.toLowerCase().includes(term)
      );
    }
  }

  openAddForm(): void {
    this.formCustomer = { name: '', phone: '', email: '', address: '', notes: '' };
    this.isEditing = false;
    this.editingCustomerId = '';
    this.showForm = true;
  }

  openEditForm(customer: Customer): void {
    this.formCustomer = {
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      address: customer.address,
      notes: customer.notes
    };
    this.isEditing = true;
    this.editingCustomerId = customer.id;
    this.showForm = true;
  }

  cancelForm(): void {
    this.showForm = false;
    this.formCustomer = { name: '', phone: '', email: '', address: '', notes: '' };
  }

  async saveCustomer(): Promise<void> {
    if (!this.formCustomer.name.trim()) {
      await this.showToast('Please enter a customer name', 'warning');
      return;
    }

    const loading = await this.loadingController.create({ message: 'Saving...' });
    await loading.present();

    try {
      if (this.isEditing) {
        await this.customerService.updateCustomer(this.editingCustomerId, this.formCustomer);
        await this.showToast('Customer updated successfully', 'success');
      } else {
        await this.customerService.addCustomer({
          ...this.formCustomer,
          totalPurchases: 0,
          totalSpent: 0,
          createdAt: Date.now()
        });
        await this.showToast('Customer added successfully', 'success');
      }
      this.cancelForm();
    } catch (error) {
      console.error('Error saving customer:', error);
      await this.showToast('Error saving customer', 'danger');
    } finally {
      await loading.dismiss();
    }
  }

  async confirmDelete(customer: Customer): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Confirm Delete',
      message: `Are you sure you want to delete "${customer.name}"?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete',
          role: 'destructive',
          handler: () => this.deleteCustomer(customer.id)
        }
      ]
    });
    await alert.present();
  }

  async deleteCustomer(id: string): Promise<void> {
    const loading = await this.loadingController.create({ message: 'Deleting...' });
    await loading.present();

    try {
      await this.customerService.deleteCustomer(id);
      await this.showToast('Customer deleted', 'success');
    } catch (error) {
      console.error('Error deleting customer:', error);
      await this.showToast('Error deleting customer', 'danger');
    } finally {
      await loading.dismiss();
    }
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
    this.customersSub?.unsubscribe();
  }
}
