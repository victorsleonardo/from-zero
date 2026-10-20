import { describe, expect, it } from 'vitest';

import { checkPeriod, listTransactions, merchantRanking, periodSummary, type CategoryInfo, type TxRow } from './finance-tools';

const CATS: CategoryInfo[] = [
  { id: 'alimentacao', name: 'Alimentação', kind: 'despesa' },
  { id: 'transporte', name: 'Transporte', kind: 'despesa' },
  { id: 'salario', name: 'Salário', kind: 'receita' },
];

const ROWS: TxRow[] = [
  { kind: 'despesa', description: 'iFood Pizzaria', merchant_key: 'ifood pizzaria', amount: 50, occurred_on: '2026-10-02', category_id: 'alimentacao' },
  { kind: 'despesa', description: 'IFOOD *Pizzaria', merchant_key: 'ifood pizzaria', amount: 30.1, occurred_on: '2026-10-09', category_id: 'alimentacao' },
  { kind: 'despesa', description: 'Uber', merchant_key: 'uber', amount: 19.9, occurred_on: '2026-10-05', category_id: 'transporte' },
  { kind: 'receita', description: 'Salário', merchant_key: 'salario', amount: 3000, occurred_on: '2026-10-05', category_id: 'salario' },
];

describe('checkPeriod', () => {
  it('aceita períodos válidos e recusa os inválidos', () => {
    expect(checkPeriod('2026-10-01', '2026-10-31')).toBeNull();
    expect(checkPeriod('2026-10-31', '2026-10-01')).toMatch(/depois/);
    expect(checkPeriod('01/10/2026', '2026-10-31')).toMatch(/AAAA-MM-DD/);
    expect(checkPeriod('2020-01-01', '2026-01-01')).toMatch(/3 anos/);
    expect(checkPeriod(undefined, '2026-01-01')).not.toBeNull();
  });
});

describe('periodSummary', () => {
  it('soma receitas, despesas e categorias', () => {
    const s = periodSummary(ROWS, CATS);
    expect(s).toMatchObject({ total_receitas: 3000, total_despesas: 100, saldo: 2900, quantidade_lancamentos: 4 });
    expect(s.por_categoria[0]).toMatchObject({ categoria: 'Salário', total: 3000, percentual_dos_gastos: null });
    expect(s.por_categoria.find((c) => c.categoria === 'Alimentação')).toMatchObject({ total: 80.1, quantidade: 2, percentual_dos_gastos: 80 });
  });
});

describe('listTransactions', () => {
  it('filtra por busca sem acento e ordena pelos maiores', () => {
    const r = listTransactions(ROWS, CATS, { busca: 'IFÓOD', ordem: 'maiores' });
    expect(r.quantidade_encontrada).toBe(2);
    expect(r.soma_dos_valores).toBe(80.1);
    expect(r.lancamentos.map((l) => l.valor)).toEqual([50, 30.1]);
  });

  it('respeita tipo, categoria e limite', () => {
    expect(listTransactions(ROWS, CATS, { tipo: 'receita' }).quantidade_encontrada).toBe(1);
    expect(listTransactions(ROWS, CATS, { categoria: 'transporte' }).lancamentos[0].descricao).toBe('Uber');
    const limited = listTransactions(ROWS, CATS, { limite: 1 });
    expect(limited.mostrando).toBe(1);
    expect(limited.lancamentos[0].data).toBe('2026-10-09');
  });
});

describe('merchantRanking', () => {
  it('agrupa o mesmo comerciante e ignora receitas', () => {
    expect(merchantRanking(ROWS, 5).comerciantes).toEqual([
      { nome: 'iFood Pizzaria', total: 80.1, quantidade: 2 },
      { nome: 'Uber', total: 19.9, quantidade: 1 },
    ]);
  });
});
