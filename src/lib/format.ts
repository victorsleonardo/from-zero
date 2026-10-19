const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function formatBRL(value: number): string {
  return brl.format(value);
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Data local de hoje como YYYY-MM-DD. */
export function today(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const date = new Date(y, m - 1, d + days);
  return today(date);
}

/** "2026-10-03" -> "03/10/2026" */
export function formatDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-');
  return `${d}/${m}/${y}`;
}

/** "03/10/2026" ou "3/10/26" -> "2026-10-03"; null se inválida. */
export function parseDate(text: string): string | null {
  const match = text.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = match[3].length === 2 ? 2000 + Number(match[3]) : Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return `${year}-${pad(month)}-${pad(day)}`;
}

/** Aceita "1.234,56", "1234,56", "12,5", "R$ 30" e "99.90". NaN se não houver número. */
export function parseAmount(text: string): number {
  const cleaned = text.replace(/[^\d,.-]/g, '');
  if (!/\d/.test(cleaned)) return NaN;
  const normalized = cleaned.includes(',') ? cleaned.replace(/\./g, '').replace(',', '.') : cleaned;
  return Math.round(Number(normalized) * 100) / 100;
}

/** Valor para preencher um campo de edição: 12.5 -> "12,50" */
export function amountToInput(value: number): string {
  return value.toFixed(2).replace('.', ',');
}

export function currentMonth(now: Date = new Date()): string {
  return today(now).slice(0, 7);
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const total = y * 12 + (m - 1) + delta;
  return `${Math.floor(total / 12)}-${pad((total % 12) + 1)}`;
}

/** Intervalo [start, end) do mês. */
export function monthRange(month: string): { start: string; end: string } {
  return { start: `${month}-01`, end: `${shiftMonth(month, 1)}-01` };
}

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return `${MONTHS[m - 1]} de ${y}`;
}
