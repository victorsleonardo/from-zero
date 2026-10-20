-- O app recebe avisos novos na hora (Realtime respeita as regras RLS de leitura).
alter publication supabase_realtime add table public.alerts;
