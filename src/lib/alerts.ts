import { supabase } from './supabase';

export type AgentTemplate = 'gasto_diario' | 'fora_do_normal' | 'assinatura_nova' | 'resumo_semanal';

export interface Alert {
  id: string;
  template: AgentTemplate;
  title: string;
  body: string;
  created_at: string;
  read_at: string | null;
}

export interface Agent {
  template: AgentTemplate;
  enabled: boolean;
  limit_amount: number | null;
}

/** Textos e ícones dos modelos de agente (a lógica roda no banco). */
export const AGENT_INFO: Record<AgentTemplate, { name: string; description: string; icon: string }> = {
  gasto_diario: {
    name: 'Limite de gasto do dia',
    description: 'Avisa quando o que você gastou hoje passar do valor que você escolher.',
    icon: 'speedometer',
  },
  fora_do_normal: {
    name: 'Gasto fora do normal',
    description: 'Avisa quando um gasto for bem maior do que o seu normal naquela categoria.',
    icon: 'alert-circle',
  },
  assinatura_nova: {
    name: 'Cobrança que se repete',
    description: 'Avisa quando o mesmo gasto aparece todo mês, como uma assinatura que você pode ter esquecido.',
    icon: 'repeat',
  },
  resumo_semanal: {
    name: 'Resumo semanal',
    description: 'Toda segunda de manhã: quanto você gastou na semana, comparado com a anterior.',
    icon: 'calendar',
  },
};

export const AGENT_ORDER: AgentTemplate[] = ['gasto_diario', 'fora_do_normal', 'assinatura_nova', 'resumo_semanal'];

export async function getAlerts(limit = 50): Promise<Alert[]> {
  const { data, error } = await supabase
    .from('alerts')
    .select('id, template, title, body, created_at, read_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as Alert[];
}

export async function countUnreadAlerts(): Promise<number> {
  const { count, error } = await supabase.from('alerts').select('id', { count: 'exact', head: true }).is('read_at', null);
  if (error) throw error;
  return count ?? 0;
}

export async function markAllAlertsRead(): Promise<void> {
  const { error } = await supabase.from('alerts').update({ read_at: new Date().toISOString() }).is('read_at', null);
  if (error) throw error;
}

export async function deleteAlert(id: string): Promise<void> {
  const { error } = await supabase.from('alerts').delete().eq('id', id);
  if (error) throw error;
}

export async function getAgents(): Promise<Agent[]> {
  const { data, error } = await supabase.from('agents').select('template, enabled, limit_amount');
  if (error) throw error;
  return data.map((a) => ({ ...a, limit_amount: a.limit_amount === null ? null : Number(a.limit_amount) })) as Agent[];
}

export async function saveAgent(userId: string, agent: Agent): Promise<void> {
  const { error } = await supabase.from('agents').upsert({
    user_id: userId,
    template: agent.template,
    enabled: agent.enabled,
    limit_amount: agent.limit_amount,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

/** "agora", "há 5 min", "há 3 h", "ontem", "12/10" */
export function timeAgo(iso: string, now: Date = new Date()): string {
  const diff = (now.getTime() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'agora';
  if (diff < 3600) return `há ${Math.floor(diff / 60)} min`;
  if (diff < 86_400) return `há ${Math.floor(diff / 3600)} h`;
  if (diff < 2 * 86_400) return 'ontem';
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}
