import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';

import { AddButton } from '@/components/add-button';
import { MonthSwitcher } from '@/components/month-switcher';
import { TransactionRow } from '@/components/transaction-row';
import { AppText, Button, Card, CategoryIcon, EmptyState } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useMonthData } from '@/hooks/use-month-data';
import { usePalette } from '@/hooks/use-palette';
import { currentMonth, formatBRL } from '@/lib/format';
import { summarize } from '@/lib/summary';

export default function HomeScreen() {
  const p = usePalette();
  const [month, setMonth] = useState(currentMonth());
  const { transactions, categories, loading, error, reload } = useMonthData(month);
  const summary = summarize(transactions, categories);
  const categoryById = new Map(categories.map((c) => [c.id, c]));

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.lg, paddingBottom: 96 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} />}>
        <MonthSwitcher month={month} onChange={setMonth} />

        <Card style={{ gap: Spacing.md }}>
          <AppText muted>Saldo do mês</AppText>
          <AppText variant="amount" color={summary.balance < 0 ? p.danger : p.text}>
            {formatBRL(summary.balance)}
          </AppText>
          <View style={{ flexDirection: 'row', gap: Spacing.lg }}>
            <View style={{ flex: 1 }}>
              <AppText variant="caption" muted>Entradas</AppText>
              <AppText variant="label" color={p.success}>{formatBRL(summary.income)}</AppText>
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="caption" muted>Gastos</AppText>
              <AppText variant="label">{formatBRL(summary.expense)}</AppText>
            </View>
          </View>
        </Card>

        {error && <AppText color={p.danger}>{error}</AppText>}

        {!loading && transactions.length === 0 ? (
          <EmptyState icon="sparkles" title="Comece do zero">
            <AppText muted style={{ textAlign: 'center' }}>
              Lance seu primeiro gasto ou receita. Eu sugiro a categoria pela descrição.
            </AppText>
          </EmptyState>
        ) : (
          <>
            {summary.byCategory.length > 0 && (
              <Card style={{ gap: Spacing.md }}>
                <AppText variant="heading">Para onde foi o dinheiro</AppText>
                {summary.byCategory.map(({ category, total, share }) => (
                  <View key={category.id} style={{ gap: Spacing.xs }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                      <CategoryIcon category={category} size={28} />
                      <AppText style={{ flex: 1 }} numberOfLines={1}>{category.name}</AppText>
                      <AppText variant="label">{formatBRL(total)}</AppText>
                    </View>
                    <View style={{ height: 6, borderRadius: Radius.pill, backgroundColor: p.surfaceAlt }}>
                      <View
                        style={{
                          height: 6,
                          borderRadius: Radius.pill,
                          width: `${Math.max(2, share * 100)}%`,
                          backgroundColor: category.color,
                        }}
                      />
                    </View>
                  </View>
                ))}
              </Card>
            )}

            <Card>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <AppText variant="heading">Últimos lançamentos</AppText>
                <Pressable onPress={() => router.push('/lancamentos')} hitSlop={8}>
                  <AppText variant="label" color={p.primary}>Ver todos</AppText>
                </Pressable>
              </View>
              {transactions.slice(0, 5).map((t) => (
                <TransactionRow key={t.id} transaction={t} category={categoryById.get(t.category_id)} />
              ))}
            </Card>
          </>
        )}

        {!loading && transactions.length === 0 && (
          <Button title="Adicionar lançamento" icon="add" onPress={() => router.push('/lancamento/novo')} />
        )}
      </ScrollView>

      <AddButton />
    </View>
  );
}
