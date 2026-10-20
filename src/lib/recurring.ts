import { addMonths } from './series';
import type { Transaction } from './types';

export type RecurringKind = 'fixo' | 'parcelado' | 'detectada';

export interface RecurringCharge {
  key: string;
  kind: RecurringKind;
  description: string;
  amount: number;
  category_id: string;
  /** Próxima cobrança esperada (YYYY-MM-DD) */
  next: string;
  /** Só para parcelas: quantas faltam, contando a próxima */
  remaining?: number;
}

/** Tira o "(3/10)" do fim da descrição de uma parcela. */
function baseDescription(description: string): string {
  return description.replace(/\s*\(\d+\/\d+\)\s*$/, '');
}

const SIMILAR = 0.15;
/** Uma cobrança detectada que não aparece há mais tempo que isso provavelmente foi cancelada. */
const STALE_DAYS = 45;

function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

/**
 * Cobranças que se repetem todo mês:
 * - gastos fixos e parcelas lançados no app (com próxima data já agendada);
 * - gastos do mesmo comerciante, com valor parecido, em pelo menos 2 meses diferentes.
 * `transactions` deve cobrir os últimos meses e os lançamentos futuros.
 */
export function findRecurring(transactions: Transaction[], today: string): RecurringCharge[] {
  const result: RecurringCharge[] = [];
  const expenses = transactions.filter((t) => t.kind === 'despesa' && !t.hidden);

  // 1. Séries lançadas no app
  const series = new Map<string, Transaction[]>();
  for (const t of expenses) {
    if (!t.series_id) continue;
    series.set(t.series_id, [...(series.get(t.series_id) ?? []), t]);
  }
  for (const [id, items] of series) {
    const upcoming = items.filter((t) => t.occurred_on >= today).sort((a, b) => a.occurred_on.localeCompare(b.occurred_on));
    if (upcoming.length === 0) continue; // série terminou
    const next = upcoming[0];
    result.push({
      key: `serie:${id}`,
      kind: next.series_type === 'parcelado' ? 'parcelado' : 'fixo',
      description: baseDescription(next.description),
      amount: next.amount,
      category_id: next.category_id,
      next: next.occurred_on,
      remaining: next.series_type === 'parcelado' ? upcoming.length : undefined,
    });
  }

  // 2. Cobranças detectadas pelo padrão (só lançamentos avulsos até hoje)
  const byMerchant = new Map<string, Transaction[]>();
  for (const t of expenses) {
    if (t.series_id || t.occurred_on > today) continue;
    byMerchant.set(t.merchant_key, [...(byMerchant.get(t.merchant_key) ?? []), t]);
  }
  for (const [merchant, items] of byMerchant) {
    const latest = [...items].sort((a, b) => b.occurred_on.localeCompare(a.occurred_on))[0];
    if (daysBetween(latest.occurred_on, today) > STALE_DAYS) continue;
    const similar = items.filter((t) => Math.abs(t.amount - latest.amount) <= latest.amount * SIMILAR);
    const months = new Set(similar.map((t) => t.occurred_on.slice(0, 7)));
    if (months.size < 2) continue;
    let next = addMonths(latest.occurred_on, 1);
    while (next < today) next = addMonths(next, 1);
    result.push({
      key: `comerciante:${merchant}`,
      kind: 'detectada',
      description: latest.description,
      amount: latest.amount,
      category_id: latest.category_id,
      next,
    });
  }

  return result.sort((a, b) => a.next.localeCompare(b.next) || b.amount - a.amount);
}

/** Total mensal das cobranças recorrentes. */
export function monthlyRecurringTotal(charges: RecurringCharge[]): number {
  return Math.round(charges.reduce((s, c) => s + c.amount, 0) * 100) / 100;
}
