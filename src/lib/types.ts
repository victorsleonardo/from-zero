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
  /** Ignorado nos totais (ex.: transferência entre contas suas) */
  hidden: boolean;
  /** Lançamentos de um mesmo gasto fixo ou compra parcelada compartilham o series_id */
  series_id: string | null;
  series_type: SeriesType | null;
}

export type SeriesType = 'fixo' | 'parcelado';

export interface CategoryRule {
  merchant_key: string;
  category_id: string;
}

export const FALLBACK_CATEGORY: Record<TransactionKind, string> = {
  despesa: 'outros',
  receita: 'outras_receitas',
};
