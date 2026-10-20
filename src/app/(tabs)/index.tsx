import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';

import { AddButton } from '@/components/add-button';
import { CashflowChart } from '@/components/cashflow-chart';
import { MonthSwitcher } from '@/components/month-switcher';
import { TransactionRow } from '@/components/transaction-row';
import { AppText, Button, Card, CategoryIcon, EmptyState } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useMonthData } from '@/hooks/use-month-data';
import { useOverview } from '@/hooks/use-overview';
import { usePalette } from '@/hooks/use-palette';
import { currentMonth, formatBRL } from '@/lib/format';
import { monthlyRecurringTotal } from '@/lib/recurring';
import { summarize } from '@/lib/summary';
import { useUnreadAlerts } from '@/lib/unread-alerts';

export default function HomeScreen() {
  const p = usePalette();
  const [month, setMonth] = useState(currentMonth());
  const { transactions, categories, loading, error, reload } = useMonthData(month);
  const summary = summarize(transactions, categories);
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const { count: unreadAlerts } = useUnreadAlerts();
  const overview = useOverview();
  const recurringTotal = monthlyRecurringTotal(overview.recurring);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.lg, paddingBottom: 96 }}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => {
              reload();
              overview.reload();
            }}
          />
        }>
        <MonthSwitcher month={month} onChange={setMonth} />

        {unreadAlerts > 0 && (
          <Pressable onPress={() => router.push('/avisos')}>
            <Card style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md, borderColor: p.primary }}>
              <AppText variant="label" style={{ flex: 1 }}>
                {unreadAlerts === 1 ? 'Você tem 1 aviso novo dos seus agentes' : `Você tem ${unreadAlerts} avisos novos dos seus agentes`}
              </AppText>
              <AppText variant="label" color={p.primary}>Ver</AppText>
            </Card>
          </Pressable>
        )}

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

        {overview.months.length > 0 && (
          <Card style={{ gap: Spacing.md }}>
            <AppText variant="heading">Entradas e gastos por mês</AppText>
            <CashflowChart data={overview.months} />
          </Card>
        )}

        {overview.recurring.length > 0 && (
          <Pressable onPress={() => router.push('/assinaturas')}>
            <Card style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
              <View style={{ flex: 1 }}>
                <AppText variant="heading">Cobranças que se repetem</AppText>
                <AppText variant="caption" muted>
                  {overview.recurring.length} cobrança{overview.recurring.length > 1 ? 's' : ''} · cerca de {formatBRL(recurringTotal)} por mês
                </AppText>
              </View>
              <AppText variant="label" color={p.primary}>Ver calendário</AppText>
            </Card>
          </Pressable>
        )}

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
