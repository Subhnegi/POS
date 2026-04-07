export interface TransactionItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
}

export interface Transaction {
  id: string;
  items: TransactionItem[];
  total: number;
  counterId: string;
  status: 'pending' | 'synced' | 'failed';
  createdAt: number;
}
