import { Component, OnInit, OnDestroy } from '@angular/core';
import { AlertController, ModalController, ToastController, LoadingController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { ProductService } from '../services/product.service';
import { Product } from '../models/product.model';

@Component({
  selector: 'app-tab-inventory',
  templateUrl: 'tab-inventory.page.html',
  styleUrls: ['tab-inventory.page.scss'],
  standalone: false,
})
export class TabInventoryPage implements OnInit, OnDestroy {
  products: Product[] = [];
  filteredProducts: Product[] = [];
  searchTerm = '';
  isLoading = true;
  private productsSub?: Subscription;

  // Add/Edit form
  showForm = false;
  isEditing = false;
  editingProductId = '';
  formProduct = { name: '', costPrice: 0, sellingPrice: 0, stock: 0, imageUrl: '' };
  isDraggingImage = false;

  constructor(
    private productService: ProductService,
    private alertController: AlertController,
    private toastController: ToastController,
    private loadingController: LoadingController
  ) {}

  ngOnInit(): void {
    this.productsSub = this.productService.getProducts().subscribe(products => {
      this.products = products;
      this.filterProducts();
      this.isLoading = false;
    });
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

  openAddForm(): void {
    this.formProduct = { name: '', costPrice: 0, sellingPrice: 0, stock: 0, imageUrl: '' };
    this.isEditing = false;
    this.editingProductId = '';
    this.showForm = true;
  }

  openEditForm(product: Product): void {
    this.formProduct = {
      name: product.name,
      costPrice: product.costPrice,
      sellingPrice: product.sellingPrice,
      stock: product.stock,
      imageUrl: product.imageUrl || ''
    };
    this.isEditing = true;
    this.editingProductId = product.id;
    this.showForm = true;
  }

  cancelForm(): void {
    this.showForm = false;
    this.formProduct = { name: '', costPrice: 0, sellingPrice: 0, stock: 0, imageUrl: '' };
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingImage = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingImage = false;
  }

  onImageDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingImage = false;
    const file = event.dataTransfer?.files[0];
    if (file && file.type.startsWith('image/')) {
      this.readImageFile(file);
    }
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.readImageFile(file);
    }
    input.value = '';
  }

  private readImageFile(file: File): void {
    if (file.size > 512000) {
      this.showToast('Image must be under 500KB', 'warning');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      this.formProduct.imageUrl = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  async saveProduct(): Promise<void> {
    if (!this.formProduct.name.trim()) {
      await this.showToast('Please enter a product name', 'warning');
      return;
    }
    if (this.formProduct.costPrice < 0) {
      await this.showToast('Cost price cannot be negative', 'warning');
      return;
    }
    if (this.formProduct.sellingPrice <= 0) {
      await this.showToast('Selling price must be greater than 0', 'warning');
      return;
    }
    if (this.formProduct.stock < 0) {
      await this.showToast('Stock cannot be negative', 'warning');
      return;
    }

    const loading = await this.loadingController.create({ message: 'Saving...' });
    await loading.present();

    try {
      if (this.isEditing) {
        await this.productService.updateProduct(this.editingProductId, this.formProduct);
        await this.showToast('Product updated successfully', 'success');
      } else {
        await this.productService.addProduct(this.formProduct);
        await this.showToast('Product added successfully', 'success');
      }
      this.cancelForm();
    } catch (error) {
      console.error('Error saving product:', error);
      await this.showToast('Error saving product', 'danger');
    } finally {
      await loading.dismiss();
    }
  }

  async confirmDelete(product: Product): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Confirm Delete',
      message: `Are you sure you want to delete "${product.name}"?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete',
          role: 'destructive',
          handler: () => this.deleteProduct(product.id)
        }
      ]
    });
    await alert.present();
  }

  async deleteProduct(id: string): Promise<void> {
    const loading = await this.loadingController.create({ message: 'Deleting...' });
    await loading.present();

    try {
      await this.productService.deleteProduct(id);
      await this.showToast('Product deleted', 'success');
    } catch (error) {
      console.error('Error deleting product:', error);
      await this.showToast('Error deleting product', 'danger');
    } finally {
      await loading.dismiss();
    }
  }

  getStockColor(stock: number): string {
    if (stock === 0) return 'danger';
    if (stock <= 5) return 'warning';
    return 'success';
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
  }
}
