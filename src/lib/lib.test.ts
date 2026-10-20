import { describe, expect, it } from 'vitest';

import { merchantKey, suggestCategory } from './categorize';
import { addDays, amountToInput, formatBRL, monthRange, parseAmount, parseDate, shiftMonth } from './format';
import { summarize } from './summary';
import type { Category, Transaction, TransactionKind } from './types';

const CATEGORIES: Category[] = [
  { id: 'alimentacao', name: 'Alimentação', kind: 'despesa', icon: 'restaurant', color: '#f00', sort: 1 },
  { id: 'mercado', name: 'Mercado', kind: 'despesa', icon: 'cart', color: '#0f0', sort: 2 },
  { id: 'transporte', name: 'Transporte', kind: 'despesa', icon: 'car', color: '#00f', sort: 5 },
  { id: 'contas', name: 'Contas da casa', kind: 'despesa', icon: 'flash', color: '#0ff', sort: 4 },
  { id: 'assinaturas', name: 'Assinaturas', kind: 'despesa', icon: 'repeat', color: '#f0f', sort: 10 },
  { id: 'outros', name: 'Outros', kind: 'despesa', icon: 'ellipsis-horizontal', color: '#999', sort: 12 },
  { id: 'salario', name: 'Salário', kind: 'receita', icon: 'briefcase', color: '#0a0', sort: 20 },
  { id: 'outras_receitas', name: 'Outras receitas', kind: 'receita', icon: 'cash', color: '#aa0', sort: 22 },
];
const KINDS = new Map<string, TransactionKind>(CATEGORIES.map((c) => [c.id, c.kind]));

describe('merchantKey', () => {
  it('agrupa descrições do mesmo comerciante', () => {
    expect(merchantKey('IFOOD *Pizzaria 0123')).toBe('ifood pizzaria');
    expect(merchantKey('iFood pizzaria')).toBe('ifood pizzaria');
    expect(merchantKey('Pão de Açúcar - Loja 12 Centro')).toBe('pao de acucar');
  });

  it('não fica vazio quando a descrição só tem números', () => {
    expect(merchantKey('12345')).toBe('12345');
  });
});

describe('suggestCategory', () => {
  it('usa palavras-chave de fábrica', () => {
    expect(suggestCategory('Uber *Trip', 'despesa', [], KINDS)).toEqual({ categoryId: 'transporte', source: 'palavra-chave' });
    expect(suggestCategory('NETFLIX.COM', 'despesa', [], KINDS).categoryId).toBe('assinaturas');
    expect(suggestCategory('Salário outubro', 'receita', [], KINDS).categoryId).toBe('salario');
  });

  it('casa só palavras inteiras', () => {
    // "tim" (operadora) não pode casar dentro de "ótimo"
    expect(suggestCategory('Presente ótimo', 'despesa', [], KINDS).categoryId).toBe('outros');
  });

  it('regra do usuário vence a palavra-chave', () => {
    const rules = [{ merchant_key: 'uber eats', category_id: 'alimentacao' }];
    expect(suggestCategory('UBER EATS 551', 'despesa', rules, KINDS)).toEqual({ categoryId: 'alimentacao', source: 'regra-sua' });
  });

  it('ignora regra de outro tipo e cai no padrão', () => {
    const rules = [{ merchant_key: 'pix joao', category_id: 'salario' }];
    expect(suggestCategory('Pix João', 'despesa', rules, KINDS)).toEqual({ categoryId: 'outros', source: 'padrao' });
    expect(suggestCategory('Pix João', 'receita', rules, KINDS).categoryId).toBe('salario');
  });
});

describe('format', () => {
  /** Intl separa "R$" do valor com espaço não separável. */
  const plain = (s: string) => s.replace(/ /g, ' ');

  it('formata e lê valores em reais', () => {
    expect(plain(formatBRL(1234.5))).toBe('R$ 1.234,50');
    expect(parseAmount('1.234,56')).toBe(1234.56);
    expect(parseAmount('R$ 12,5')).toBe(12.5);
    expect(parseAmount('99.90')).toBe(99.9);
    expect(Number.isNaN(parseAmount('abc'))).toBe(true);
    expect(amountToInput(12.5)).toBe('12,50');
  });

  it('lê datas no formato brasileiro e recusa datas impossíveis', () => {
    expect(parseDate('03/10/2026')).toBe('2026-10-03');
    expect(parseDate('3/10/26')).toBe('2026-10-03');
    expect(parseDate('31/02/2026')).toBeNull();
    expect(parseDate('2026-10-03')).toBeNull();
  });

  it('navega por dias e meses', () => {
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(monthRange('2026-12')).toEqual({ start: '2026-12-01', end: '2027-01-01' });
  });
});

describe('summarize', () => {
  const tx = (partial: Partial<Transaction>): Transaction => ({
    id: Math.random().toString(),
    kind: 'despesa',
    description: 'x',
    merchant_key: 'x',
    amount: 10,
    occurred_on: '2026-10-05',
    category_id: 'outros',
    notes: null,
    hidden: false,
    series_id: null,
    series_type: null,
    ...partial,
  });

  it('soma entradas, gastos e ordena categorias', () => {
    const s = summarize(
      [
        tx({ amount: 30.1, category_id: 'mercado' }),
        tx({ amount: 10.2, category_id: 'transporte' }),
        tx({ amount: 9.9, category_id: 'mercado' }),
        tx({ kind: 'receita', amount: 100, category_id: 'salario' }),
      ],
      CATEGORIES,
    );
    expect(s.income).toBe(100);
    expect(s.expense).toBe(50.2);
    expect(s.balance).toBe(49.8);
    expect(s.byCategory.map((c) => [c.category.id, c.total])).toEqual([
      ['mercado', 40],
      ['transporte', 10.2],
    ]);
    expect(s.byCategory[0].share).toBeCloseTo(40 / 50.2);
  });
});
