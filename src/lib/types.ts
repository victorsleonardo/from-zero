export type TransactionKind = 'despesa' | 'receita';

export interface Category {
  id: string;
  name: string;
  kind: TransactionKind;
  /** Nome de um ícone do Ionicons */
  icon: string;
  color: string;
  sort: number;
}

export interface Transaction {
  id: string;
  kind: TransactionKind;
  description: string;
  merchant_key: string;
  amount: number;
  /** YYYY-MM-DD */
  occurred_on: string;
  category_id: string;
  notes: string | null;
}

export interface CategoryRule {
  merchant_key: string;
  category_id: string;
}

export const FALLBACK_CATEGORY: Record<TransactionKind, string> = {
  despesa: 'outros',
  receita: 'outras_receitas',
};
