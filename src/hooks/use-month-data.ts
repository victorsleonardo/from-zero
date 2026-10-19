import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

import { getCategories, getMonthTransactions } from '@/lib/data';
import type { Category, Transaction } from '@/lib/types';

interface MonthData {
  transactions: Transaction[];
  categories: Category[];
  loading: boolean;
  error: string | null;
  reload: () => void;
}

/** Lançamentos e categorias do mês; recarrega sempre que a tela volta ao foco. */
export function useMonthData(month: string): MonthData {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Só a resposta do pedido mais recente vale (ex.: ao trocar de mês rápido).
  const latestRequest = useRef(0);

  const reload = useCallback(() => {
    const request = ++latestRequest.current;
    setLoading(true);
    Promise.all([getMonthTransactions(month), getCategories()])
      .then(([txs, cats]) => {
        if (request !== latestRequest.current) return;
        setTransactions(txs);
        setCategories(cats);
        setError(null);
      })
      .catch(() => {
        if (request === latestRequest.current) setError('Não foi possível carregar. Puxe para tentar de novo.');
      })
      .finally(() => {
        if (request === latestRequest.current) setLoading(false);
      });
  }, [month]);

  useFocusEffect(reload);

  return { transactions, categories, loading, error, reload };
}
