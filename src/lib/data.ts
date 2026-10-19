import { merchantKey } from './categorize';
import { monthRange } from './format';
import { supabase } from './supabase';
import type { Category, CategoryRule, Transaction, TransactionKind } from './types';

const TX_COLUMNS = 'id, kind, description, merchant_key, amount, occurred_on, category_id, notes';

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
}

export async function createTransaction(input: TransactionInput): Promise<void> {
  const { error } = await supabase
    .from('transactions')
    .insert({ ...input, merchant_key: merchantKey(input.description) });
  if (error) throw error;
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
