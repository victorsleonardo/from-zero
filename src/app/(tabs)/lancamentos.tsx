import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, TextInput, View } from 'react-native';

import { AddButton } from '@/components/add-button';
import { MonthSwitcher } from '@/components/month-switcher';
import { TransactionRow } from '@/components/transaction-row';
import { AppText, Chip, EmptyState } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useMonthData } from '@/hooks/use-month-data';
import { usePalette } from '@/hooks/use-palette';
import { normalize } from '@/lib/categorize';
import { currentMonth, formatBRL } from '@/lib/format';
import { summarize } from '@/lib/summary';
import type { TransactionKind } from '@/lib/types';

type Filter = 'todos' | TransactionKind;

export default function TransactionsScreen() {
  const p = usePalette();
  const [month, setMonth] = useState(currentMonth());
  const [filter, setFilter] = useState<Filter>('todos');
  const [category, setCategory] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const { transactions, categories, loading, error, reload } = useMonthData(month);
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const summary = summarize(transactions, categories);

  const term = normalize(search);
  const visible = transactions.filter(
    (t) =>
      (filter === 'todos' || t.kind === filter) &&
      (!category || t.category_id === category) &&
      (!term || normalize(t.description).includes(term)),
  );
  const filtering = !!category || !!term;
  const visibleTotal = visible.filter((t) => !t.hidden).reduce((s, t) => s + (t.kind === 'receita' ? t.amount : -t.amount), 0);
  // Só as categorias que aparecem no mês, na ordem do app
  const usedCategories = categories.filter((c) => transactions.some((t) => t.category_id === c.id));

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={visible}
        keyExtractor={(t) => t.id}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} />}
        contentContainerStyle={{ paddingHorizontal: Spacing.lg, paddingBottom: 96 }}
        ListHeaderComponent={
          <View style={{ gap: Spacing.md, paddingVertical: Spacing.lg }}>
            <MonthSwitcher month={month} onChange={setMonth} />

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: Spacing.sm,
                backgroundColor: p.surface,
                borderColor: p.border,
                borderWidth: 1,
                borderRadius: Radius.md,
                paddingHorizontal: Spacing.md,
              }}>
              <Ionicons name="search" size={18} color={p.textSecondary} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Buscar pela descrição"
                placeholderTextColor={p.textSecondary}
                autoCorrect={false}
                style={{ flex: 1, paddingVertical: 10, fontSize: 16, color: p.text }}
              />
              {search ? (
                <Pressable accessibilityLabel="Limpar busca" hitSlop={10} onPress={() => setSearch('')}>
                  <Ionicons name="close-circle" size={18} color={p.textSecondary} />
                </Pressable>
              ) : null}
            </View>

            <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
              <Chip label="Todos" selected={filter === 'todos'} onPress={() => setFilter('todos')} />
              <Chip label={`Gastos ${formatBRL(summary.expense)}`} selected={filter === 'despesa'} onPress={() => setFilter('despesa')} />
              <Chip label={`Entradas ${formatBRL(summary.income)}`} selected={filter === 'receita'} onPress={() => setFilter('receita')} />
            </View>

            {usedCategories.length > 1 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.sm }}>
                {usedCategories.map((c) => (
                  <Chip
                    key={c.id}
                    label={c.name}
                    color={c.color}
                    selected={category === c.id}
                    onPress={() => setCategory(category === c.id ? null : c.id)}
                  />
                ))}
              </ScrollView>
            )}

            {filtering && visible.length > 0 && (
              <AppText variant="caption" muted>
                {visible.length} lançamento{visible.length > 1 ? 's' : ''} · total {formatBRL(Math.abs(visibleTotal))}
              </AppText>
            )}
            {error && <AppText color={p.danger}>{error}</AppText>}
          </View>
        }
        ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: p.border }} />}
        renderItem={({ item }) => <TransactionRow transaction={item} category={categoryById.get(item.category_id)} />}
        ListEmptyComponent={
          loading ? undefined : filtering ? (
            <EmptyState icon="search" title="Nada encontrado">
              <AppText muted>Tente outra busca ou outra categoria.</AppText>
            </EmptyState>
          ) : (
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
