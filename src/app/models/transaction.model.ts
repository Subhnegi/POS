export interface TransactionItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  costPrice: number;
}

export interface Transaction {
  id: string;
  items: TransactionItem[];
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  total: number;
  customerName: string;
  customerPhone: string;
  offerCode: string;
  paymentMethod: string;
  counterId: string;
  status: 'pending' | 'synced' | 'failed';
  createdAt: number;
}
