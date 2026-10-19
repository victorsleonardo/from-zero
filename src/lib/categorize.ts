import { FALLBACK_CATEGORY, type CategoryRule, type TransactionKind } from './types';

/** Minúsculas, sem acento e com espaços simples. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Chave do "comerciante": a descrição sem números, símbolos e acentos, até
 * 3 palavras. "IFOOD *Pizzaria 0123" e "iFood pizzaria" viram "ifood pizzaria".
 */
export function merchantKey(description: string): string {
  const key = normalize(description)
    .replace(/[^a-z ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .slice(0, 3)
    .join(' ');
  return key || normalize(description).slice(0, 40);
}

/** Palavras-chave de fábrica -> categoria (lista fixa do app). */
const BUILT_IN_RULES: { kind: TransactionKind; category: string; keywords: string[] }[] = [
  { kind: 'despesa', category: 'assinaturas', keywords: ['netflix', 'spotify', 'prime video', 'amazon prime', 'disney', 'hbo', 'max', 'globoplay', 'youtube premium', 'deezer', 'icloud', 'google one', 'chatgpt', 'claude', 'apple com', 'assinatura', 'microsoft'] },
  { kind: 'despesa', category: 'transporte', keywords: ['uber', 'pop', 'taxi', 'gasolina', 'combustivel', 'posto', 'shell', 'ipiranga', 'petrobras', 'estacionamento', 'pedagio', 'metro', 'onibus', 'sem parar', 'veloe'] },
  { kind: 'despesa', category: 'alimentacao', keywords: ['ifood', 'rappi', 'restaurante', 'lanchonete', 'padaria', 'pizzaria', 'pizza', 'burger', 'mcdonald', 'mc donalds', 'bk', 'outback', 'cafe', 'starbucks', 'bar', 'acai', 'almoco', 'jantar', 'lanche'] },
  { kind: 'despesa', category: 'mercado', keywords: ['mercado', 'supermercado', 'carrefour', 'pao de acucar', 'assai', 'atacadao', 'hortifruti', 'sacolao', 'feira', 'atacarejo'] },
  { kind: 'despesa', category: 'moradia', keywords: ['aluguel', 'condominio', 'iptu', 'reforma', 'moveis', 'leroy'] },
  { kind: 'despesa', category: 'contas', keywords: ['luz', 'energia', 'enel', 'cemig', 'copel', 'light', 'agua', 'sabesp', 'gas', 'comgas', 'internet', 'vivo', 'claro', 'tim', 'celular', 'telefone'] },
  { kind: 'despesa', category: 'saude', keywords: ['farmacia', 'drogasil', 'droga raia', 'drogaria', 'pague menos', 'medico', 'consulta', 'exame', 'dentista', 'plano de saude', 'unimed', 'amil', 'hospital', 'academia', 'smartfit', 'smart fit'] },
  { kind: 'despesa', category: 'educacao', keywords: ['escola', 'faculdade', 'curso', 'udemy', 'alura', 'livro', 'livraria', 'mensalidade escolar'] },
  { kind: 'despesa', category: 'lazer', keywords: ['cinema', 'show', 'ingresso', 'teatro', 'viagem', 'hotel', 'airbnb', 'passagem', 'steam', 'playstation', 'xbox', 'jogo'] },
  { kind: 'despesa', category: 'compras', keywords: ['shopee', 'mercado livre', 'amazon', 'magalu', 'magazine luiza', 'americanas', 'shein', 'aliexpress', 'renner', 'riachuelo', 'roupa', 'loja'] },
  { kind: 'despesa', category: 'seguros', keywords: ['seguro', 'tarifa', 'taxa', 'anuidade', 'juros', 'iof', 'multa'] },
  { kind: 'receita', category: 'salario', keywords: ['salario', 'holerite', 'folha', 'pagamento empresa', 'vale alimentacao', 'decimo terceiro'] },
  { kind: 'receita', category: 'renda_extra', keywords: ['freela', 'freelance', 'bico', 'venda', 'projeto', 'cliente', 'comissao'] },
];

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const BUILT_IN_PATTERNS = BUILT_IN_RULES.map((rule) => ({
  ...rule,
  // só a palavra inteira: "tim" não casa com "otimo"
  pattern: new RegExp(`(^|[^a-z0-9])(${rule.keywords.map((k) => escapeRegExp(normalize(k))).join('|')})($|[^a-z0-9])`),
}));

export type CategorySource = 'regra-sua' | 'palavra-chave' | 'padrao';

/**
 * Escolhe a categoria de um lançamento:
 * 1. regra do usuário para o mesmo comerciante;
 * 2. palavras-chave de fábrica;
 * 3. categoria genérica ("Outros" / "Outras receitas").
 */
export function suggestCategory(
  description: string,
  kind: TransactionKind,
  userRules: CategoryRule[],
  categoryKinds: Map<string, TransactionKind>,
): { categoryId: string; source: CategorySource } {
  const key = merchantKey(description);
  const rule = userRules.find((r) => r.merchant_key === key && categoryKinds.get(r.category_id) === kind);
  if (rule) return { categoryId: rule.category_id, source: 'regra-sua' };

  const text = normalize(description);
  for (const r of BUILT_IN_PATTERNS) {
    if (r.kind === kind && r.pattern.test(text)) return { categoryId: r.category, source: 'palavra-chave' };
  }
  return { categoryId: FALLBACK_CATEGORY[kind], source: 'padrao' };
}
