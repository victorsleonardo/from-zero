import { describe, expect, it, vi } from 'vitest';

// alerts.ts importa o cliente do Supabase; nos testes só a formatação importa.
vi.mock('./supabase', () => ({ supabase: {} }));

const { timeAgo } = await import('./alerts');

describe('timeAgo', () => {
  const now = new Date('2026-10-20T15:00:00');
  it('mostra tempos curtos de forma amigável', () => {
    expect(timeAgo('2026-10-20T14:59:30', now)).toBe('agora');
    expect(timeAgo('2026-10-20T14:55:00', now)).toBe('há 5 min');
    expect(timeAgo('2026-10-20T12:00:00', now)).toBe('há 3 h');
    expect(timeAgo('2026-10-19T10:00:00', now)).toBe('ontem');
    expect(timeAgo('2026-10-12T10:00:00', now)).toBe('12/10');
  });
});
