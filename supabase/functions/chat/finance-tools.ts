// Lógica pura das ferramentas do assistente (sem Deno nem Supabase), para poder testar.

export type Kind = 'despesa' | 'receita';

export interface TxRow {
  kind: Kind;
  description: string;
  merchant_key: string;
  amount: number;
  /** YYYY-MM-DD */
  occurred_on: string;
  category_id: string;
}

export interface CategoryInfo {
  id: string;
  name: string;
  kind: Kind;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_RANGE_DAYS = 366 * 3;

const round = (n: number) => Math.round(n * 100) / 100;

/** Valida um período [inicio, fim] (inclusivo). Devolve mensagem de erro ou null. */
export function checkPeriod(inicio: unknown, fim: unknown): string | null {
  if (typeof inicio !== 'string' || typeof fim !== 'string' || !DATE_RE.test(inicio) || !DATE_RE.test(fim)) {
    return 'Use datas no formato AAAA-MM-DD em "inicio" e "fim".';
  }
  const start = Date.parse(`${inicio}T00:00:00Z`);
  const end = Date.parse(`${fim}T00:00:00Z`);
  if (Number.isNaN(start) || Number.isNaN(end)) return 'Data inválida.';
  if (end < start) return '"fim" precisa ser igual ou depois de "inicio".';
  if ((end - start) / 86_400_000 > MAX_RANGE_DAYS) return 'Período longo demais: use no máximo 3 anos.';
  return null;
}

export function periodSummary(rows: TxRow[], categories: CategoryInfo[]) {
  const names = new Map(categories.map((c) => [c.id, c.name]));
  let receitas = 0;
  let despesas = 0;
  const byCategory = new Map<string, { total: number; quantidade: number }>();
  for (const r of rows) {
    if (r.kind === 'receita') receitas += r.amount;
    else despesas += r.amount;
    const entry = byCategory.get(r.category_id) ?? { total: 0, quantidade: 0 };
    entry.total += r.amount;
    entry.quantidade += 1;
    byCategory.set(r.category_id, entry);
  }
  const porCategoria = [...byCategory.entries()]
    .map(([id, v]) => ({
      categoria: names.get(id) ?? id,
      tipo: categories.find((c) => c.id === id)?.kind ?? 'despesa',
      total: round(v.total),
      quantidade: v.quantidade,
      percentual_dos_gastos: despesas > 0 && categories.find((c) => c.id === id)?.kind !== 'receita' ? Math.round((v.total / despesas) * 100) : null,
    }))
    .sort((a, b) => b.total - a.total);
  return {
    total_receitas: round(receitas),
    total_despesas: round(despesas),
    saldo: round(receitas - despesas),
    quantidade_lancamentos: rows.length,
    por_categoria: porCategoria,
  };
}

export interface ListOptions {
  tipo?: 'despesa' | 'receita' | 'todos';
  categoria?: string;
  busca?: string;
  ordem?: 'recentes' | 'maiores';
  limite?: number;
}

function normalize(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').trim();
}

export function listTransactions(rows: TxRow[], categories: CategoryInfo[], opts: ListOptions) {
  const names = new Map(categories.map((c) => [c.id, c.name]));
  const limite = Math.min(50, Math.max(1, Math.floor(opts.limite ?? 20)));
  const busca = opts.busca ? normalize(opts.busca) : '';
  let list = rows.filter(
    (r) =>
      (!opts.tipo || opts.tipo === 'todos' || r.kind === opts.tipo) &&
      (!opts.categoria || r.category_id === opts.categoria) &&
      (!busca || normalize(r.description).includes(busca)),
  );
  const total = list.length;
  const soma = round(list.reduce((s, r) => s + r.amount, 0));
  list = [...list].sort((a, b) => (opts.ordem === 'maiores' ? b.amount - a.amount : b.occurred_on.localeCompare(a.occurred_on)));
  return {
    quantidade_encontrada: total,
    soma_dos_valores: soma,
    mostrando: Math.min(limite, total),
    lancamentos: list.slice(0, limite).map((r) => ({
      data: r.occurred_on,
      descricao: r.description,
      tipo: r.kind,
      categoria: names.get(r.category_id) ?? r.category_id,
      valor: round(r.amount),
    })),
  };
}

export function merchantRanking(rows: TxRow[], limite = 10) {
  const groups = new Map<string, { total: number; quantidade: number; exemplo: string }>();
  for (const r of rows) {
    if (r.kind !== 'despesa') continue;
    const g = groups.get(r.merchant_key) ?? { total: 0, quantidade: 0, exemplo: r.description };
    g.total += r.amount;
    g.quantidade += 1;
    groups.set(r.merchant_key, g);
  }
  const n = Math.min(30, Math.max(1, Math.floor(limite)));
  return {
    comerciantes: [...groups.values()]
      .sort((a, b) => b.total - a.total)
      .slice(0, n)
      .map((g) => ({ nome: g.exemplo, total: round(g.total), quantidade: g.quantidade })),
  };
}
