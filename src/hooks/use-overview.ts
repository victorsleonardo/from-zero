import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

import { getMonthlyTotals, getTransactionsBetween, type MonthTotal } from '@/lib/data';
import { addDays, today } from '@/lib/format';
import { findRecurring, type RecurringCharge } from '@/lib/recurring';

interface Overview {
  months: MonthTotal[];
  recurring: RecurringCharge[];
  loading: boolean;
  error: string | null;
  reload: () => void;
}

/** Totais dos últimos 6 meses e cobranças recorrentes; recarrega quando a tela volta ao foco. */
export function useOverview(): Overview {
  const [months, setMonths] = useState<MonthTotal[]>([]);
  const [recurring, setRecurring] = useState<RecurringCharge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const latestRequest = useRef(0);

  const reload = useCallback(() => {
    const request = ++latestRequest.current;
    const now = today();
    setLoading(true);
    // Passado recente para detectar o padrão + futuro para fixos e parcelas já agendados.
    Promise.all([getMonthlyTotals(6), getTransactionsBetween(addDays(now, -120), addDays(now, 800))])
      .then(([totals, txs]) => {
        if (request !== latestRequest.current) return;
        setMonths(totals);
        setRecurring(findRecurring(txs, now));
        setError(null);
      })
      .catch(() => {
        if (request === latestRequest.current) setError('Não foi possível carregar o resumo.');
      })
      .finally(() => {
        if (request === latestRequest.current) setLoading(false);
      });
  }, []);

  useFocusEffect(reload);
  return { months, recurring, loading, error, reload };
}
