import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { usePalette } from '@/hooks/use-palette';
import type { MonthTotal } from '@/lib/data';
import { formatBRL } from '@/lib/format';

const SHORT_MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const FULL_MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const CHART_HEIGHT = 120;
const BAR_WIDTH = 10;

function monthIndex(month: string): number {
  return Number(month.slice(5, 7)) - 1;
}

/** Barras agrupadas de entradas x gastos por mês. Toque num mês para ver os valores. */
export function CashflowChart({ data }: { data: MonthTotal[] }) {
  const p = usePalette();
  // -1 = mês mais recente
  const [selected, setSelected] = useState(-1);
  const max = Math.max(1, ...data.flatMap((d) => [d.income, d.expense]));
  const index = selected >= 0 && selected < data.length ? selected : data.length - 1;
  const current = data[index];
  const empty = data.every((d) => d.income === 0 && d.expense === 0);

  const bar = (value: number, color: string) => (
    <View
      style={{
        width: BAR_WIDTH,
        // barra mínima visível só quando há valor
        height: value > 0 ? Math.max(3, (value / max) * CHART_HEIGHT) : 0,
        backgroundColor: color,
        borderTopLeftRadius: 4,
        borderTopRightRadius: 4,
      }}
    />
  );

  return (
    <View style={{ gap: Spacing.md }}>
      <View style={{ flexDirection: 'row', gap: Spacing.lg }}>
        {[
          { label: 'Entradas', color: p.chartIncome },
          { label: 'Gastos', color: p.chartExpense },
        ].map((s) => (
          <View key={s.label} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs }}>
            <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: s.color }} />
            <AppText variant="caption" muted>{s.label}</AppText>
          </View>
        ))}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: CHART_HEIGHT, borderBottomWidth: 1, borderBottomColor: p.border }}>
        {data.map((d, i) => (
          <Pressable
            key={d.month}
            accessibilityRole="button"
            accessibilityLabel={`${FULL_MONTHS[monthIndex(d.month)]}: entradas ${formatBRL(d.income)}, gastos ${formatBRL(d.expense)}`}
            onPress={() => setSelected(i)}
            style={{
              flex: 1,
              height: '100%',
              flexDirection: 'row',
              alignItems: 'flex-end',
              justifyContent: 'center',
              gap: 2,
              borderRadius: 6,
              backgroundColor: i === index ? p.surfaceAlt : 'transparent',
            }}>
            {bar(d.income, p.chartIncome)}
            {bar(d.expense, p.chartExpense)}
          </Pressable>
        ))}
      </View>

      <View style={{ flexDirection: 'row' }}>
        {data.map((d, i) => (
          <AppText
            key={d.month}
            variant="caption"
            muted={i !== index}
            style={{ flex: 1, textAlign: 'center', fontWeight: i === index ? '600' : '400' }}>
            {SHORT_MONTHS[monthIndex(d.month)]}
          </AppText>
        ))}
      </View>

      {empty ? (
        <AppText variant="caption" muted>Os meses aparecem aqui conforme você for lançando.</AppText>
      ) : (
        current && (
          <View style={{ gap: 2 }}>
            <AppText variant="label">
              {FULL_MONTHS[monthIndex(current.month)]} de {current.month.slice(0, 4)}
            </AppText>
            <AppText variant="caption" muted>
              Entradas {formatBRL(current.income)} · Gastos {formatBRL(current.expense)} · Saldo{' '}
              {formatBRL(current.income - current.expense)}
            </AppText>
          </View>
        )
      )}
    </View>
  );
}
