import { merchantKey } from './categorize';
import { monthRange } from './format';
import { expandSeries } from './series';
import { supabase } from './supabase';
import type { Category, CategoryRule, SeriesType, Transaction, TransactionKind } from './types';

const TX_COLUMNS = 'id, kind, description, merchant_key, amount, occurred_on, category_id, notes, hidden, series_id, series_type';

function toTransaction(row: Record<string, unknown>): Transaction {
  return { ...(row as unknown as Transaction), amount: Number(row.amount) };
}

let categoriesCache: Category[] | null = null;

/** As categorias são fixas; busca uma vez por sessão do app. */
export async function getCategories(): Promise<Category[]> {
  if (categoriesCache) return categoriesCache;
  const { data, error } = await supabase.from('categories').select('id, name, kind, icon, color, sort').order('sort');
  if (error) throw error;
  categoriesCache = data as Category[];
  return categoriesCache;
}

export async function getMonthTransactions(month: string): Promise<Transaction[]> {
  const { start, end } = monthRange(month);
  const { data, error } = await supabase
    .from('transactions')
    .select(TX_COLUMNS)
    .gte('occurred_on', start)
    .lt('occurred_on', end)
    .order('occurred_on', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data.map(toTransaction);
}

/** Lançamentos com data em [start, end] (inclusivo), para cálculos de vários meses. */
export async function getTransactionsBetween(start: string, end: string): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select(TX_COLUMNS)
    .gte('occurred_on', start)
    .lte('occurred_on', end)
    .order('occurred_on', { ascending: false })
    .limit(5000);
  if (error) throw error;
  return data.map(toTransaction);
}

export interface MonthTotal {
  /** YYYY-MM-01 */
  month: string;
  income: number;
  expense: number;
}

/** Entradas e gastos dos últimos meses (o atual incluído), sem os ignorados. */
export async function getMonthlyTotals(months = 6): Promise<MonthTotal[]> {
  const { data, error } = await supabase.rpc('monthly_totals', { p_months: months });
  if (error) throw error;
  return (data as { month: string; income: string; expense: string }[]).map((r) => ({
    month: r.month,
    income: Number(r.income),
    expense: Number(r.expense),
  }));
}

export async function getTransaction(id: string): Promise<Transaction | null> {
  const { data, error } = await supabase.from('transactions').select(TX_COLUMNS).eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? toTransaction(data) : null;
}

export async function getRules(): Promise<CategoryRule[]> {
  const { data, error } = await supabase.from('category_rules').select('merchant_key, category_id');
  if (error) throw error;
  return data;
}

export interface TransactionInput {
  kind: TransactionKind;
  description: string;
  amount: number;
  occurred_on: string;
  category_id: string;
  notes: string | null;
  hidden: boolean;
}

export interface Repeat {
  type: SeriesType;
  /** Meses (fixo) ou parcelas (parcelado), de 2 a 60 */
  count: number;
}

/**
 * Cria um lançamento, ou vários de uma vez quando é gasto fixo (mesmo valor por N meses)
 * ou compra parcelada (valor total dividido em N parcelas mensais).
 */
export async function createTransaction(input: TransactionInput, repeat?: Repeat): Promise<void> {
  const key = merchantKey(input.description);
  if (!repeat || repeat.count < 2) {
    const { error } = await supabase.from('transactions').insert({ ...input, merchant_key: key });
    if (error) throw error;
    return;
  }
  const seriesId = randomUuid();
  const rows = expandSeries(
    { description: input.description, amount: input.amount, occurred_on: input.occurred_on },
    repeat.type,
    repeat.count,
  ).map((item) => ({ ...input, ...item, merchant_key: key, series_id: seriesId, series_type: repeat.type }));
  const { error } = await supabase.from('transactions').insert(rows);
  if (error) throw error;
}

/** UUID v4 sem depender de crypto.randomUUID (nem sempre existe no celular). */
function randomUuid(): string {
  const hex = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16));
  hex[12] = '4';
  hex[16] = ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  const h = hex.join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export async function updateTransaction(id: string, input: TransactionInput): Promise<void> {
  const { error } = await supabase
    .from('transactions')
    .update({ ...input, merchant_key: merchantKey(input.description) })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteTransaction(id: string): Promise<void> {
  const { error } = await supabase.from('transactions').delete().eq('id', id);
  if (error) throw error;
}

/** Apaga este lançamento e os próximos da mesma série (fixo ou parcelas). */
export async function deleteSeriesFrom(transaction: Transaction): Promise<void> {
  if (!transaction.series_id) return deleteTransaction(transaction.id);
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('series_id', transaction.series_id)
    .gte('occurred_on', transaction.occurred_on);
  if (error) throw error;
}

/** Guarda "comerciante X vai para a categoria Y" para os próximos lançamentos. */
export async function saveRule(userId: string, key: string, categoryId: string): Promise<void> {
  const { error } = await supabase
    .from('category_rules')
    .upsert({ user_id: userId, merchant_key: key, category_id: categoryId, updated_at: new Date().toISOString() });
  if (error) throw error;
}

/** Quantos lançamentos do mesmo comerciante e tipo estão em outra categoria. */
export async function countSimilar(key: string, kind: TransactionKind, categoryId: string, exceptId?: string): Promise<number> {
  let query = supabase
    .from('transactions')
    .select('id', { count: 'exact', head: true })
    .eq('merchant_key', key)
    .eq('kind', kind)
    .neq('category_id', categoryId);
  if (exceptId) query = query.neq('id', exceptId);
  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

export async function applyCategoryToSimilar(key: string, kind: TransactionKind, categoryId: string): Promise<void> {
  const { error } = await supabase
    .from('transactions')
    .update({ category_id: categoryId })
    .eq('merchant_key', key)
    .eq('kind', kind)
    .neq('category_id', categoryId);
  if (error) throw error;
}
