import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef, useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, Chip } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { usePalette } from '@/hooks/use-palette';
import { useAuth } from '@/lib/auth';
import { clearChatHistory, getChatHistory, sendChatMessage, type ChatMessage } from '@/lib/chat';

const SUGGESTIONS = [
  'Quanto gastei este mês?',
  'Onde mais gastei no mês passado?',
  'Quais foram meus maiores gastos?',
  'Como posso economizar?',
];

interface Bubble extends ChatMessage {
  error?: boolean;
}

/** Tira o negrito em Markdown, caso o modelo use. */
function plain(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, '$1');
}

export default function AssistantScreen() {
  const p = usePalette();
  const { session } = useAuth();
  // Mais recente primeiro: a lista é invertida (cresce de baixo para cima).
  const [messages, setMessages] = useState<Bubble[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const counter = useRef(0);

  useEffect(() => {
    getChatHistory()
      .then(setMessages)
      .catch(() => {})
      .finally(() => setLoadingHistory(false));
  }, []);

  async function send(text: string) {
    const question = text.trim();
    if (!question || sending) return;
    setInput('');
    setSending(true);
    setStatus('Pensando…');
    const now = new Date().toISOString();
    const replyId = `reply-${++counter.current}`;
    setMessages((prev) => [
      { id: replyId, role: 'assistant', content: '', created_at: now },
      { id: `ask-${counter.current}`, role: 'user', content: question, created_at: now },
      ...prev,
    ]);

    const update = (fn: (m: Bubble) => Bubble) => setMessages((prev) => prev.map((m) => (m.id === replyId ? fn(m) : m)));

    try {
      await sendChatMessage(question, (event) => {
        if (event.type === 'text') {
          setStatus(null);
          update((m) => ({ ...m, content: m.content + event.text }));
        } else if (event.type === 'status') {
          setStatus(event.text);
        } else if (event.type === 'error') {
          update((m) => ({ ...m, content: m.content ? `${m.content}\n\n${event.message}` : event.message, error: true }));
        }
      });
    } catch {
      update((m) => ({ ...m, content: 'Sem conexão. Verifique a internet e tente de novo.', error: true }));
    } finally {
      // Se nada chegou, não deixa um balão vazio para trás.
      setMessages((prev) => prev.filter((m) => m.id !== replyId || m.content));
      setStatus(null);
      setSending(false);
    }
  }

  function clear() {
    if (!session || messages.length === 0) return;
    Alert.alert('Apagar a conversa?', 'O histórico com o Zero será apagado.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Apagar',
        style: 'destructive',
        onPress: () =>
          clearChatHistory(session.user.id)
            .then(() => setMessages([]))
            .catch(() => Alert.alert('Não foi possível apagar agora.')),
      },
    ]);
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: p.background }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md }}>
        <View style={{ flex: 1 }}>
          <AppText variant="heading">Zero</AppText>
          <AppText variant="caption" muted>Seu assistente financeiro</AppText>
        </View>
        {messages.length > 0 && (
          <Pressable accessibilityLabel="Apagar conversa" hitSlop={12} onPress={clear} disabled={sending}>
            <Ionicons name="trash-outline" size={22} color={p.textSecondary} />
          </Pressable>
        )}
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <FlatList
          inverted={messages.length > 0}
          data={messages}
          keyExtractor={(m) => m.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.sm, flexGrow: 1 }}
          ListHeaderComponent={
            status ? (
              <AppText variant="caption" muted style={{ marginTop: Spacing.xs }}>
                {status}
              </AppText>
            ) : null
          }
          ListEmptyComponent={
            loadingHistory ? null : (
              <View style={{ flex: 1, justifyContent: 'center', gap: Spacing.md }}>
                <AppText variant="title">Oi! Eu sou o Zero.</AppText>
                <AppText muted>Pergunte qualquer coisa sobre os seus gastos. Eu consulto seus lançamentos para responder.</AppText>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
                  {SUGGESTIONS.map((s) => (
                    <Chip key={s} label={s} onPress={() => send(s)} />
                  ))}
                </View>
              </View>
            )
          }
          renderItem={({ item }) => {
            const mine = item.role === 'user';
            if (!mine && !item.content) return null;
            return (
              <View
                style={{
                  alignSelf: mine ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  backgroundColor: mine ? p.primary : p.surface,
                  borderColor: item.error ? p.danger : p.border,
                  borderWidth: mine ? 0 : 1,
                  borderRadius: Radius.lg,
                  borderBottomRightRadius: mine ? Radius.sm : Radius.lg,
                  borderBottomLeftRadius: mine ? Radius.lg : Radius.sm,
                  paddingHorizontal: Spacing.md,
                  paddingVertical: Spacing.sm + 2,
                }}>
                <AppText color={mine ? p.onPrimary : item.error ? p.danger : p.text} selectable>
                  {plain(item.content)}
                </AppText>
              </View>
            );
          }}
        />

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-end',
            gap: Spacing.sm,
            padding: Spacing.md,
            borderTopWidth: 1,
            borderTopColor: p.border,
            backgroundColor: p.surface,
          }}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Pergunte sobre seus gastos…"
            placeholderTextColor={p.textSecondary}
            multiline
            maxLength={1000}
            style={{
              flex: 1,
              maxHeight: 120,
              backgroundColor: p.surfaceAlt,
              borderRadius: Radius.lg,
              paddingHorizontal: Spacing.md,
              paddingVertical: 10,
              fontSize: 16,
              color: p.text,
            }}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Enviar"
            onPress={() => send(input)}
            disabled={sending || !input.trim()}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: p.primary,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: sending || !input.trim() ? 0.4 : 1,
            }}>
            <Ionicons name="arrow-up" size={22} color={p.onPrimary} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
