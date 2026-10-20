import type { Category, Transaction } from './types';

export interface MonthSummary {
  income: number;
  expense: number;
  balance: number;
  /** Gastos por categoria, do maior para o menor */
  byCategory: { category: Category; total: number; share: number }[];
}

export function summarize(transactions: Transaction[], categories: Category[]): MonthSummary {
  const byId = new Map(categories.map((c) => [c.id, c]));
  let income = 0;
  let expense = 0;
  const totals = new Map<string, number>();

  for (const t of transactions) {
    if (t.hidden) continue;
    if (t.kind === 'receita') {
      income += t.amount;
    } else {
      expense += t.amount;
      totals.set(t.category_id, (totals.get(t.category_id) ?? 0) + t.amount);
    }
  }

  const byCategory = [...totals.entries()]
    .map(([id, total]) => ({ category: byId.get(id), total }))
    .filter((x): x is { category: Category; total: number } => !!x.category)
    .sort((a, b) => b.total - a.total)
    .map((x) => ({ ...x, share: expense > 0 ? x.total / expense : 0 }));

  const round = (n: number) => Math.round(n * 100) / 100;
  return { income: round(income), expense: round(expense), balance: round(income - expense), byCategory };
}
