import { useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';

import { AddButton } from '@/components/add-button';
import { MonthSwitcher } from '@/components/month-switcher';
import { TransactionRow } from '@/components/transaction-row';
import { AppText, Chip, EmptyState } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useMonthData } from '@/hooks/use-month-data';
import { usePalette } from '@/hooks/use-palette';
import { currentMonth, formatBRL } from '@/lib/format';
import { summarize } from '@/lib/summary';
import type { TransactionKind } from '@/lib/types';

type Filter = 'todos' | TransactionKind;

export default function TransactionsScreen() {
  const p = usePalette();
  const [month, setMonth] = useState(currentMonth());
  const [filter, setFilter] = useState<Filter>('todos');
  const { transactions, categories, loading, error, reload } = useMonthData(month);
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const summary = summarize(transactions, categories);
  const visible = filter === 'todos' ? transactions : transactions.filter((t) => t.kind === filter);

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={visible}
        keyExtractor={(t) => t.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} />}
        contentContainerStyle={{ paddingHorizontal: Spacing.lg, paddingBottom: 96 }}
        ListHeaderComponent={
          <View style={{ gap: Spacing.md, paddingVertical: Spacing.lg }}>
            <MonthSwitcher month={month} onChange={setMonth} />
            <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
              <Chip label="Todos" selected={filter === 'todos'} onPress={() => setFilter('todos')} />
              <Chip label={`Gastos ${formatBRL(summary.expense)}`} selected={filter === 'despesa'} onPress={() => setFilter('despesa')} />
              <Chip label={`Entradas ${formatBRL(summary.income)}`} selected={filter === 'receita'} onPress={() => setFilter('receita')} />
            </View>
            {error && <AppText color={p.danger}>{error}</AppText>}
          </View>
        }
        ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: p.border }} />}
        renderItem={({ item }) => <TransactionRow transaction={item} category={categoryById.get(item.category_id)} />}
        ListEmptyComponent={
          loading ? undefined : (
            <EmptyState icon="receipt-outline" title="Nada lançado neste mês">
              <AppText muted>Toque no + para adicionar.</AppText>
            </EmptyState>
          )
        }
      />
      <AddButton />
    </View>
  );
}
