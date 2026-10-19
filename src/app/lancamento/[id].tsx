import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { TransactionForm } from '@/components/transaction-form';
import { EmptyState } from '@/components/ui';
import { getTransaction } from '@/lib/data';
import type { Transaction } from '@/lib/types';

export default function EditTransactionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [transaction, setTransaction] = useState<Transaction | null | undefined>(undefined);

  useEffect(() => {
    getTransaction(id)
      .then(setTransaction)
      .catch(() => setTransaction(null));
  }, [id]);

  if (transaction === undefined) {
    return (
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }
  if (transaction === null) return <EmptyState icon="alert-circle-outline" title="Lançamento não encontrado" />;
  return <TransactionForm initial={transaction} />;
}
