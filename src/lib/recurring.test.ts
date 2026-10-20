import { describe, expect, it } from 'vitest';

import { findRecurring, monthlyRecurringTotal } from './recurring';
import { addMonths, expandSeries } from './series';
import type { Transaction } from './types';

let seq = 0;
const tx = (p: Partial<Transaction>): Transaction => ({
  id: `t${++seq}`,
  kind: 'despesa',
  description: 'x',
  merchant_key: 'x',
  amount: 10,
  occurred_on: '2026-10-01',
  category_id: 'outros',
  notes: null,
  hidden: false,
  series_id: null,
  series_type: null,
  ...p,
});

describe('series', () => {
  it('mantém o dia ou usa o último dia do mês', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2026-11-15', 3)).toBe('2027-02-15');
  });

  it('divide parcelas em centavos sem perder valor', () => {
    const items = expandSeries({ description: 'Celular', amount: 100, occurred_on: '2026-10-05' }, 'parcelado', 3);
    expect(items.map((i) => i.amount)).toEqual([33.34, 33.33, 33.33]);
    expect(items.map((i) => i.description)).toEqual(['Celular (1/3)', 'Celular (2/3)', 'Celular (3/3)']);
    expect(items.map((i) => i.occurred_on)).toEqual(['2026-10-05', '2026-11-05', '2026-12-05']);
  });

  it('repete o valor cheio no fixo', () => {
    expect(expandSeries({ description: 'Aluguel', amount: 1500, occurred_on: '2026-10-01' }, 'fixo', 2)).toEqual([
      { description: 'Aluguel', amount: 1500, occurred_on: '2026-10-01' },
      { description: 'Aluguel', amount: 1500, occurred_on: '2026-11-01' },
    ]);
  });
});

describe('findRecurring', () => {
  const today = '2026-10-20';

  it('mostra a próxima parcela e quantas faltam', () => {
    const rows = expandSeries({ description: 'Celular', amount: 300, occurred_on: '2026-09-10' }, 'parcelado', 3).map((i) =>
      tx({ ...i, series_id: 's1', series_type: 'parcelado', merchant_key: 'celular' }),
    );
    expect(findRecurring(rows, today)).toEqual([
      { key: 'serie:s1', kind: 'parcelado', description: 'Celular', amount: 100, category_id: 'outros', next: '2026-11-10', remaining: 1 },
    ]);
  });

  it('detecta cobrança do mesmo comerciante em meses diferentes', () => {
    const found = findRecurring(
      [
        tx({ description: 'Netflix', merchant_key: 'netflix', amount: 55.9, occurred_on: '2026-08-15' }),
        tx({ description: 'Netflix', merchant_key: 'netflix', amount: 55.9, occurred_on: '2026-09-15' }),
        tx({ description: 'Mercado', merchant_key: 'mercado', amount: 100, occurred_on: '2026-09-01' }),
        tx({ description: 'Mercado', merchant_key: 'mercado', amount: 400, occurred_on: '2026-10-01' }),
      ],
      today,
    );
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ kind: 'detectada', description: 'Netflix', amount: 55.9, next: '2026-11-15' });
  });

  it('ignora o que parou de cobrar, os ocultos e séries encerradas', () => {
    const found = findRecurring(
      [
        tx({ merchant_key: 'antigo', amount: 20, occurred_on: '2026-06-01' }),
        tx({ merchant_key: 'antigo', amount: 20, occurred_on: '2026-07-01' }),
        tx({ merchant_key: 'oculto', amount: 30, occurred_on: '2026-09-05', hidden: true }),
        tx({ merchant_key: 'oculto', amount: 30, occurred_on: '2026-10-05', hidden: true }),
        tx({ merchant_key: 'curso', amount: 50, occurred_on: '2026-09-01', series_id: 's2', series_type: 'parcelado' }),
      ],
      today,
    );
    expect(found).toEqual([]);
  });

  it('soma o total mensal', () => {
    expect(monthlyRecurringTotal([{ amount: 55.9 }, { amount: 21.9 }] as never)).toBe(77.8);
  });
});
