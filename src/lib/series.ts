import type { SeriesType } from './types';

export interface SeriesItem {
  description: string;
  amount: number;
  /** YYYY-MM-DD */
  occurred_on: string;
}

/** Soma meses a uma data YYYY-MM-DD mantendo o dia (31/01 + 1 mês = 28/02). */
export function addMonths(isoDate: string, months: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const total = y * 12 + (m - 1) + months;
  const year = Math.floor(total / 12);
  const month = (total % 12) + 1;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${year}-${String(month).padStart(2, '0')}-${String(Math.min(d, lastDay)).padStart(2, '0')}`;
}

/**
 * Gera os lançamentos de uma série:
 * - "fixo": o mesmo valor todo mês, por `count` meses;
 * - "parcelado": o valor total dividido em `count` parcelas, com "(1/N)" na descrição.
 */
export function expandSeries(base: SeriesItem, type: SeriesType, count: number): SeriesItem[] {
  if (count <= 1) return [base];
  if (type === 'fixo') {
    return Array.from({ length: count }, (_, i) => ({ ...base, occurred_on: addMonths(base.occurred_on, i) }));
  }
  // Divide em centavos; a sobra da divisão vai na primeira parcela.
  const cents = Math.round(base.amount * 100);
  const each = Math.floor(cents / count);
  const remainder = cents - each * count;
  return Array.from({ length: count }, (_, i) => ({
    description: `${base.description} (${i + 1}/${count})`,
    amount: (each + (i === 0 ? remainder : 0)) / 100,
    occurred_on: addMonths(base.occurred_on, i),
  }));
}
