# From Zero

Suas finanças, from zero. App Android (Expo SDK 57 + React Native) de finanças pessoais com lançamento manual, categorias automáticas e, nas próximas etapas, um assistente de IA e agentes de alerta.

## Testar no celular (Expo Go)

1. Instale o app **Expo Go** no celular (Play Store).
2. No PC (Node.js 20+), dentro desta pasta:
   ```bash
   npm install
   npx expo start
   ```
3. Abra o Expo Go e escaneie o QR code que aparece no terminal. PC e celular precisam estar na mesma rede Wi-Fi
   (se não funcionar, use `npx expo start --tunnel`).

O arquivo `.env` já aponta para o projeto **From Zero** no Supabase. A chave dele é a publicável, feita para ir dentro do app; quem protege os dados são as regras RLS do banco.

## O que já tem (etapa 1)

- Login e cadastro por e-mail.
- Lançamentos de gastos e entradas: criar, editar e excluir.
- 12 categorias fixas de gasto e 3 de entrada.
- Categoria sugerida automaticamente pela descrição (iFood → Alimentação, Uber → Transporte…).
- Quando você corrige uma categoria, o app aprende ("comerciante X vai para Y") e oferece aplicar a correção nos lançamentos parecidos.
- Início com saldo do mês, entradas, gastos e gastos por categoria; lista por mês com filtro.

## Comandos

| Comando | O que faz |
|---|---|
| `npx expo start` | Servidor de desenvolvimento (abre no Expo Go) |
| `npm test` | Testes da lógica (categorização, datas, valores, resumo) |
| `npx expo lint` | Lint |
| `npm run typecheck` | Checagem de tipos |

## Banco de dados

O schema está em `supabase/migrations/`. Toda tabela tem RLS: cada usuário só vê e altera os próprios dados.
