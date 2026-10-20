import { fetch } from 'expo/fetch';

import { createSseParser, type ChatEvent } from './sse';
import { supabase } from './supabase';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export async function getChatHistory(limit = 60): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('id, role, content, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as ChatMessage[];
}

export async function clearChatHistory(userId: string): Promise<void> {
  const { error } = await supabase.from('chat_messages').delete().eq('user_id', userId);
  if (error) throw error;
}

/**
 * Envia a pergunta para a função "chat" no Supabase e repassa os eventos
 * conforme chegam (texto aos pedaços, status, erro, fim).
 */
export async function sendChatMessage(message: string, onEvent: (event: ChatEvent) => void): Promise<void> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    onEvent({ type: 'error', message: 'Faça login de novo.' });
    return;
  }

  const response = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/chat`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: process.env.EXPO_PUBLIC_SUPABASE_KEY ?? '',
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify({ message }),
  });

  if (!response.ok || !response.body) {
    let text = 'Não foi possível falar com o assistente agora.';
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) text = body.error;
    } catch {
      // resposta sem JSON: fica a mensagem padrão
    }
    onEvent({ type: 'error', message: text });
    return;
  }

  const parse = createSseParser(onEvent);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    parse(decoder.decode(value, { stream: true }));
  }
  parse(decoder.decode());
}
