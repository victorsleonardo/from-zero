import { useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';

import { AppText, Card, CategoryIcon, EmptyState } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useOverview } from '@/hooks/use-overview';
import { usePalette } from '@/hooks/use-palette';
import { getCategories } from '@/lib/data';
import { formatBRL, formatDate, monthLabel, today } from '@/lib/format';
import { monthlyRecurringTotal, type RecurringCharge } from '@/lib/recurring';
import type { Category } from '@/lib/types';

const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const KIND_LABEL: Record<RecurringCharge['kind'], string> = {
  fixo: 'Gasto fixo',
  parcelado: 'Parcela',
  detectada: 'Detectada pelo app',
};

/** Dia do mês em que a cobrança cai (usando a próxima data esperada). */
function chargeDay(charge: RecurringCharge): number {
  return Number(charge.next.slice(8, 10));
}

export default function SubscriptionsScreen() {
  const p = usePalette();
  const { recurring, loading, error, reload } = useOverview();
  const [categories, setCategories] = useState<Category[]>([]);
  const [day, setDay] = useState<number | null>(null);

  useEffect(() => {
    getCategories().then(setCategories).catch(() => {});
  }, []);

  const byId = new Map(categories.map((c) => [c.id, c]));
  const now = today();
  const month = now.slice(0, 7);
  const [year, monthNumber] = month.split('-').map(Number);
  const daysInMonth = new Date(year, monthNumber, 0).getDate();
  const firstWeekday = new Date(year, monthNumber - 1, 1).getDay();
  const todayDay = Number(now.slice(8, 10));
  const daysWithCharges = new Set(recurring.map(chargeDay));
  const visible = day === null ? recurring : recurring.filter((c) => chargeDay(c) === day);
  const total = monthlyRecurringTotal(recurring);

  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <ScrollView
      contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.lg }}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} />}>
      {error && <AppText color={p.danger}>{error}</AppText>}

      <Card style={{ gap: Spacing.xs }}>
        <AppText muted>Cobranças que se repetem</AppText>
        <AppText variant="amount">{formatBRL(total)}<AppText muted> por mês</AppText></AppText>
        <AppText variant="caption" muted>
          {recurring.length === 0
            ? 'Nada por enquanto.'
            : `${recurring.length} cobrança${recurring.length > 1 ? 's' : ''}: gastos fixos, parcelas e o que o app percebeu que se repete.`}
        </AppText>
      </Card>

      <Card style={{ gap: Spacing.sm }}>
        <AppText variant="heading">{monthLabel(month)}</AppText>
        <View style={{ flexDirection: 'row' }}>
          {WEEKDAYS.map((w, i) => (
            <AppText key={i} variant="caption" muted style={{ flex: 1, textAlign: 'center' }}>
              {w}
            </AppText>
          ))}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {cells.map((d, i) => {
            const has = d !== null && daysWithCharges.has(d);
            const isSelected = d !== null && d === day;
            return (
              <Pressable
                key={i}
                disabled={!has}
                accessibilityRole="button"
                accessibilityLabel={d ? `Dia ${d}${has ? ', tem cobrança' : ''}` : undefined}
                onPress={() => setDay(isSelected ? null : d)}
                style={{ width: `${100 / 7}%`, aspectRatio: 1, padding: 2 }}>
                {d !== null && (
                  <View
                    style={{
                      flex: 1,
                      borderRadius: Radius.sm,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: isSelected ? p.primary : has ? p.primary + '22' : 'transparent',
                      borderWidth: d === todayDay ? 1 : 0,
                      borderColor: p.textSecondary,
                    }}>
                    <AppText variant="label" color={isSelected ? p.onPrimary : has ? p.text : p.textSecondary}>
                      {d}
                    </AppText>
                    {has && !isSelected && (
                      <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: p.primary, marginTop: 1 }} />
                    )}
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
        <AppText variant="caption" muted>
          {day === null ? 'Toque num dia marcado para ver o que cai nele.' : `Mostrando o dia ${day}. Toque de novo para ver tudo.`}
        </AppText>
      </Card>

      {!loading && recurring.length === 0 ? (
        <EmptyState icon="repeat" title="Nenhuma cobrança recorrente">
          <AppText muted style={{ textAlign: 'center' }}>
            Lance gastos fixos e compras parceladas com a opção &quot;Repetir&quot;. O app também percebe sozinho quando o mesmo
            gasto aparece todo mês.
          </AppText>
        </EmptyState>
      ) : (
        visible.map((c) => (
          <Card key={c.key} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
            <CategoryIcon category={byId.get(c.category_id)} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <AppText numberOfLines={1}>{c.description}</AppText>
              <AppText variant="caption" muted>
                {KIND_LABEL[c.kind]}
                {c.remaining ? ` · falta${c.remaining > 1 ? 'm' : ''} ${c.remaining}` : ''} · próxima {formatDate(c.next).slice(0, 5)}
              </AppText>
            </View>
            <AppText variant="label">{formatBRL(c.amount)}</AppText>
          </Card>
        ))
      )}
    </ScrollView>
  );
}
