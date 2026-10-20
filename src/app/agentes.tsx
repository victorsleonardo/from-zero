import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Switch, View } from 'react-native';

import { AppText, Button, Card, TextField } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { usePalette } from '@/hooks/use-palette';
import { AGENT_INFO, AGENT_ORDER, getAgents, saveAgent, type Agent, type AgentTemplate } from '@/lib/alerts';
import { useAuth } from '@/lib/auth';
import { amountToInput, formatBRL, parseAmount } from '@/lib/format';

export default function AgentsScreen() {
  const p = usePalette();
  const { session } = useAuth();
  const [agents, setAgents] = useState<Record<AgentTemplate, Agent> | null>(null);
  const [limitText, setLimitText] = useState('');
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const [savingLimit, setSavingLimit] = useState(false);

  useEffect(() => {
    getAgents()
      .then((list) => {
        const byTemplate = Object.fromEntries(
          AGENT_ORDER.map((t) => [t, list.find((a) => a.template === t) ?? { template: t, enabled: false, limit_amount: null }]),
        ) as Record<AgentTemplate, Agent>;
        setAgents(byTemplate);
        const limit = byTemplate.gasto_diario.limit_amount;
        setLimitText(limit ? amountToInput(limit) : '');
      })
      .catch(() => setMessage({ text: 'Não foi possível carregar os agentes.', error: true }));
  }, []);

  async function persist(next: Agent) {
    if (!session || !agents) return false;
    const previous = agents[next.template];
    setAgents({ ...agents, [next.template]: next });
    try {
      await saveAgent(session.user.id, next);
      return true;
    } catch {
      setAgents((current) => (current ? { ...current, [next.template]: previous } : current));
      setMessage({ text: 'Não foi possível salvar. Verifique a internet.', error: true });
      return false;
    }
  }

  async function toggle(template: AgentTemplate, enabled: boolean) {
    if (!agents) return;
    setMessage(null);
    if (template === 'gasto_diario' && enabled && !agents.gasto_diario.limit_amount) {
      setMessage({ text: 'Defina o valor do limite abaixo e toque em "Salvar limite" para ligar.', error: true });
      return;
    }
    await persist({ ...agents[template], enabled });
  }

  async function saveLimit() {
    if (!agents) return;
    setMessage(null);
    const value = parseAmount(limitText);
    if (!Number.isFinite(value) || value <= 0) {
      setMessage({ text: 'Informe um valor maior que zero.', error: true });
      return;
    }
    setSavingLimit(true);
    const ok = await persist({ template: 'gasto_diario', enabled: true, limit_amount: value });
    setSavingLimit(false);
    if (ok) {
      setLimitText(amountToInput(value));
      setMessage({ text: `Pronto! Aviso quando o gasto do dia passar de ${formatBRL(value)}.` });
    }
  }

  if (!agents) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.md }}>
        {message ? <AppText color={p.danger}>{message.text}</AppText> : <ActivityIndicator />}
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.md }} keyboardShouldPersistTaps="handled">
      <AppText muted>
        Os agentes trabalham sozinhos, mesmo com o app fechado, e avisam na aba Avisos quando algo merecer atenção.
      </AppText>

      {AGENT_ORDER.map((template) => {
        const info = AGENT_INFO[template];
        const agent = agents[template];
        return (
          <Card key={template} style={{ gap: Spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
              <Ionicons name={info.icon as 'calendar'} size={22} color={p.primary} />
              <View style={{ flex: 1, gap: 2 }}>
                <AppText variant="label">{info.name}</AppText>
                <AppText variant="caption" muted>{info.description}</AppText>
              </View>
              <Switch
                value={agent.enabled}
                onValueChange={(v) => toggle(template, v)}
                trackColor={{ true: p.primary, false: p.border }}
                accessibilityLabel={info.name}
              />
            </View>
            {template === 'gasto_diario' && (
              <View style={{ gap: Spacing.sm }}>
                <TextField
                  label="Limite por dia (R$)"
                  value={limitText}
                  onChangeText={setLimitText}
                  placeholder="Ex.: 100,00"
                  keyboardType="decimal-pad"
                />
                <Button title="Salvar limite" variant="ghost" onPress={saveLimit} loading={savingLimit} />
              </View>
            )}
          </Card>
        );
      })}

      {message && <AppText color={message.error ? p.danger : p.success}>{message.text}</AppText>}
    </ScrollView>
  );
}
