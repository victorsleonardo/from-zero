import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Switch, View } from 'react-native';

import { AppText, Button, Chip, Segmented, TextField } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { usePalette } from '@/hooks/use-palette';
import { useAuth } from '@/lib/auth';
import { merchantKey, suggestCategory } from '@/lib/categorize';
import {
  applyCategoryToSimilar,
  countSimilar,
  createTransaction,
  deleteSeriesFrom,
  deleteTransaction,
  getCategories,
  getRules,
  saveRule,
  updateTransaction,
} from '@/lib/data';
import { addDays, amountToInput, formatBRL, formatDate, parseAmount, parseDate, today } from '@/lib/format';
import type { Category, CategoryRule, SeriesType, Transaction, TransactionKind } from '@/lib/types';
import { useUnreadAlerts } from '@/lib/unread-alerts';

type RepeatChoice = 'nao' | SeriesType;

const REPEAT_DEFAULT: Record<SeriesType, string> = { fixo: '12', parcelado: '3' };

function confirm(title: string, message: string, okText: string): Promise<boolean> {
  return new Promise((resolve) =>
    Alert.alert(title, message, [
      { text: 'Agora não', style: 'cancel', onPress: () => resolve(false) },
      { text: okText, onPress: () => resolve(true) },
    ]),
  );
}

export function TransactionForm({ initial }: { initial?: Transaction }) {
  const p = usePalette();
  const { session } = useAuth();
  const { refresh: refreshAlerts } = useUnreadAlerts();
  const [categories, setCategories] = useState<Category[]>([]);
  const [rules, setRules] = useState<CategoryRule[]>([]);

  const [kind, setKind] = useState<TransactionKind>(initial?.kind ?? 'despesa');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [amount, setAmount] = useState(initial ? amountToInput(initial.amount) : '');
  const [date, setDate] = useState(formatDate(initial?.occurred_on ?? today()));
  const [notes, setNotes] = useState(initial?.notes ?? '');
  /** Categoria escolhida à mão; null = usar a sugestão automática. */
  const [pickedCategory, setPickedCategory] = useState<string | null>(initial?.category_id ?? null);
  const [hidden, setHidden] = useState(initial?.hidden ?? false);
  const [repeat, setRepeat] = useState<RepeatChoice>('nao');
  const [repeatCount, setRepeatCount] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getCategories(), getRules()])
      .then(([cats, r]) => {
        setCategories(cats);
        setRules(r);
      })
      .catch(() => setError('Não foi possível carregar as categorias.'));
  }, []);

  const kinds = useMemo(() => new Map(categories.map((c) => [c.id, c.kind])), [categories]);
  const suggestion = suggestCategory(description, kind, rules, kinds);
  const categoryId = pickedCategory && kinds.get(pickedCategory) === kind ? pickedCategory : suggestion.categoryId;
  const options = categories.filter((c) => c.kind === kind);

  async function save() {
    setError(null);
    const value = parseAmount(amount);
    const occurredOn = parseDate(date);
    if (!description.trim()) return setError('Descreva o lançamento.');
    if (!Number.isFinite(value) || value <= 0) return setError('Informe um valor maior que zero.');
    if (!occurredOn) return setError('Data inválida. Use o formato DD/MM/AAAA.');
    const count = Number(repeatCount);
    if (repeat !== 'nao' && (!Number.isInteger(count) || count < 2 || count > 60)) {
      return setError(repeat === 'fixo' ? 'Escolha de 2 a 60 meses.' : 'Escolha de 2 a 60 parcelas.');
    }

    const input = {
      kind,
      description: description.trim(),
      amount: value,
      occurred_on: occurredOn,
      category_id: categoryId,
      notes: notes.trim() || null,
      hidden,
    };
    const key = merchantKey(input.description);
    // Aprende a regra quando a pessoa escolhe a categoria (ou corrige a de um lançamento existente).
    const learned = initial ? initial.category_id !== categoryId : pickedCategory !== null && categoryId !== suggestion.categoryId;

    setSaving(true);
    try {
      if (initial) await updateTransaction(initial.id, input);
      else await createTransaction(input, repeat === 'nao' ? undefined : { type: repeat, count });

      if (learned && session) {
        await saveRule(session.user.id, key, categoryId);
        const similar = await countSimilar(key, kind, categoryId);
        if (similar > 0) {
          const name = categories.find((c) => c.id === categoryId)?.name ?? '';
          const apply = await confirm(
            'Aplicar aos parecidos?',
            `Encontrei ${similar} outro${similar > 1 ? 's' : ''} lançamento${similar > 1 ? 's' : ''} de "${input.description}" em outra categoria. Mudar para ${name} também?`,
            'Aplicar',
          );
          if (apply) await applyCategoryToSimilar(key, kind, categoryId);
        }
      }
      // Um gasto novo pode ter disparado um agente.
      refreshAlerts();
      router.back();
    } catch {
      setError('Não foi possível salvar. Verifique a internet e tente de novo.');
    } finally {
      setSaving(false);
    }
  }

  function remove() {
    if (!initial) return;
    const run = (action: () => Promise<void>) => async () => {
      try {
        await action();
        router.back();
      } catch {
        setError('Não foi possível excluir.');
      }
    };
    if (initial.series_id) {
      const what = initial.series_type === 'parcelado' ? 'as próximas parcelas' : 'os próximos meses';
      Alert.alert('Excluir lançamento?', `Este lançamento faz parte de uma série. Quer apagar também ${what}?`, [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Só este', onPress: run(() => deleteTransaction(initial.id)) },
        { text: 'Este e os próximos', style: 'destructive', onPress: run(() => deleteSeriesFrom(initial)) },
      ]);
      return;
    }
    Alert.alert('Excluir lançamento?', `"${initial.description}" será apagado.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: run(() => deleteTransaction(initial.id)) },
    ]);
  }

  function chooseRepeat(choice: RepeatChoice) {
    setRepeat(choice);
    setRepeatCount(choice === 'nao' ? '' : REPEAT_DEFAULT[choice]);
  }

  const amountValue = parseAmount(amount);
  const countValue = Number(repeatCount);
  const repeatHint =
    repeat === 'nao' || !Number.isInteger(countValue) || countValue < 2
      ? undefined
      : repeat === 'fixo'
        ? `O mesmo valor vai ser lançado todo mês, por ${countValue} meses, a partir da data acima.`
        : Number.isFinite(amountValue) && amountValue > 0
          ? `${countValue} parcelas de cerca de ${formatBRL(amountValue / countValue)}, uma por mês.`
          : 'Informe o valor total da compra; ele é dividido entre as parcelas.';

  const todayIso = today();
  const sourceHint =
    pickedCategory === null && description.trim()
      ? suggestion.source === 'regra-sua'
        ? 'Sugerida pelo que você escolheu antes.'
        : suggestion.source === 'palavra-chave'
          ? 'Sugerida pela descrição.'
          : undefined
      : undefined;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.lg }} keyboardShouldPersistTaps="handled">
        <Segmented<TransactionKind>
          options={[
            { value: 'despesa', label: 'Gasto' },
            { value: 'receita', label: 'Entrada' },
          ]}
          value={kind}
          onChange={(k) => {
            setKind(k);
            // Entrada não tem parcelamento.
            if (k === 'receita' && repeat === 'parcelado') chooseRepeat('nao');
          }}
        />

        <TextField
          label="Descrição"
          value={description}
          onChangeText={setDescription}
          placeholder={kind === 'despesa' ? 'Ex.: iFood, Uber, Mercado' : 'Ex.: Salário, Freela'}
          maxLength={200}
          autoFocus={!initial}
        />

        <TextField
          label={repeat === 'parcelado' ? 'Valor total da compra (R$)' : 'Valor (R$)'}
          value={amount}
          onChangeText={setAmount}
          placeholder="0,00"
          keyboardType="decimal-pad"
        />

        <View style={{ gap: Spacing.sm }}>
          <TextField label="Data" value={date} onChangeText={setDate} placeholder="DD/MM/AAAA" keyboardType="numbers-and-punctuation" />
          <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
            <Chip label="Hoje" selected={parseDate(date) === todayIso} onPress={() => setDate(formatDate(todayIso))} />
            <Chip
              label="Ontem"
              selected={parseDate(date) === addDays(todayIso, -1)}
              onPress={() => setDate(formatDate(addDays(todayIso, -1)))}
            />
          </View>
        </View>

        <View style={{ gap: Spacing.sm }}>
          <AppText variant="label">Categoria</AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
            {options.map((c) => (
              <Chip key={c.id} label={c.name} color={c.color} selected={c.id === categoryId} onPress={() => setPickedCategory(c.id)} />
            ))}
          </View>
          {sourceHint && <AppText variant="caption" muted>{sourceHint}</AppText>}
        </View>

        {!initial && (
          <View style={{ gap: Spacing.sm }}>
            <AppText variant="label">Repetir</AppText>
            <Segmented<RepeatChoice>
              options={[
                { value: 'nao', label: 'Não' },
                { value: 'fixo', label: 'Todo mês' },
                ...(kind === 'despesa' ? [{ value: 'parcelado' as const, label: 'Parcelado' }] : []),
              ]}
              value={repeat}
              onChange={chooseRepeat}
            />
            {repeat !== 'nao' && (
              <TextField
                label={repeat === 'fixo' ? 'Por quantos meses?' : 'Quantas parcelas?'}
                value={repeatCount}
                onChangeText={setRepeatCount}
                keyboardType="number-pad"
                maxLength={2}
                hint={repeatHint}
              />
            )}
          </View>
        )}

        <TextField label="Observação" value={notes} onChangeText={setNotes} placeholder="Opcional" maxLength={500} />

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
          <View style={{ flex: 1 }}>
            <AppText variant="label">Ignorar nos totais</AppText>
            <AppText variant="caption" muted>
              Para transferências entre contas suas, que não são gasto nem renda.
            </AppText>
          </View>
          <Switch value={hidden} onValueChange={setHidden} trackColor={{ true: p.primary, false: p.border }} />
        </View>

        {error && <AppText color={p.danger}>{error}</AppText>}

        <Button title={initial ? 'Salvar alterações' : 'Adicionar'} onPress={save} loading={saving} />
        {initial && <Button title="Excluir lançamento" variant="danger" icon="trash-outline" onPress={remove} />}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
