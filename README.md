# Mini CRM SDR com Gerador de Mensagens IA

CRM para equipes de SDR e pre-vendas com gestao de leads por workspace, funil SDR em Kanban, campanhas de abordagem e geracao de mensagens personalizadas com IA.

O projeto foi desenvolvido como uma aplicacao SaaS multi-workspace, usando Supabase para autenticacao, banco PostgreSQL, RLS e Edge Functions. O frontend foi construido com React, TypeScript, Vite e TailwindCSS.

## Deploy

Aplicacao publicada:
https://mini-crm-sdr-ai-vercel.vercel.app

## Tecnologias utilizadas

### Frontend

- React
- TypeScript
- Vite
- TailwindCSS
- React Router

### Backend e infraestrutura

- Supabase Auth
- Supabase PostgreSQL
- Supabase RLS
- Supabase Edge Functions

### IA

- OpenAI API
- Modelo configuravel via secret `OPENAI_MODEL`
- Chave protegida via secret `OPENAI_API_KEY`

### Outros

- npm
- Git/GitHub
- ESLint

## Funcionalidades implementadas

- [x] Autenticacao com Supabase Auth
- [x] Cadastro e login por email/senha
- [x] Protecao de rotas autenticadas
- [x] Workspace inicial por usuario
- [x] Multi-tenancy com `workspace_id`
- [x] Memberships por workspace
- [x] RLS por workspace
- [x] CRUD de leads
- [x] Responsavel pelo lead
- [x] Campos personalizados por workspace
- [x] Funil SDR configuravel por workspace
- [x] Visualizacao Kanban
- [x] Movimentacao de leads entre etapas
- [x] Regras de transicao por etapa
- [x] Campanhas de abordagem
- [x] Geracao de mensagens com IA
- [x] Geracao automatica de mensagens por etapa gatilho
- [x] Regenerar mensagens
- [x] Copiar mensagem
- [x] Envio simulado
- [x] Historico de mensagens geradas
- [x] Historico de atividades do lead
- [x] Registro de criacao, edicao e movimentacao de lead
- [x] Registro de geracao, copia e envio simulado de mensagens
- [x] Dashboard com metricas do workspace

## Decisoes tecnicas

### Supabase para Auth, PostgreSQL e RLS

O Supabase foi usado para concentrar autenticacao, persistencia e seguranca no mesmo stack. Isso reduz a quantidade de infraestrutura propria e permite validar rapidamente um fluxo SaaS real com usuarios autenticados, banco relacional e politicas de acesso por linha.

### Multi-tenancy com workspaces

O isolamento principal do sistema usa `workspace_id` nas tabelas de dominio e a tabela `workspace_members` para identificar quais usuarios participam de cada workspace. Cada lead, etapa, campanha, campo personalizado e mensagem gerada pertence a um workspace.

### RLS por workspace

As politicas de RLS garantem que usuarios autenticados so consigam ler ou alterar dados dos workspaces dos quais sao membros. O frontend nunca usa service role key e todas as chamadas client-side passam pelo usuario autenticado.

### Campos personalizados com JSONB

Os valores dos campos personalizados dos leads ficam em `leads.custom_fields` como JSONB. Essa decisao permite que cada workspace tenha campos proprios sem exigir migrations para cada novo campo criado pelo usuario.

### Regras de transicao com JSONB

As regras de campos obrigatorios por etapa ficam em `pipeline_stages.required_fields` como JSONB. Isso permite configurar requisitos por etapa do funil usando campos padrao do lead e campos personalizados do workspace.

### Edge Function para IA

A geracao de mensagens roda na Supabase Edge Function `generate-lead-messages`. O frontend chama a function autenticado, mas nunca acessa a chave da OpenAI. A chave fica em secrets do Supabase, configurada como `OPENAI_API_KEY`.

### Persistencia das mensagens geradas

As mensagens geradas sao salvas em `generated_messages`, associadas a workspace, lead, campanha e usuario que solicitou a geracao. A tabela tambem guarda snapshots do lead/campanha, status da mensagem e metadados como modelo usado.

### Historico de atividades

A tabela `lead_activities` registra eventos importantes do lead, como criacao, edicao, mudanca de etapa, geracao de mensagens, copia e envio simulado. O campo `metadata` usa JSONB para guardar detalhes contextuais de cada evento sem exigir novas migrations para cada tipo de atividade.

As politicas de RLS garantem que as atividades so sejam visiveis para membros do workspace correspondente, mantendo o mesmo modelo de isolamento usado em leads, campanhas e mensagens geradas.

### Geracao automatica por etapa gatilho

Campanhas podem ser vinculadas a uma etapa do funil por meio de `campaigns.trigger_stage_id`. Quando um lead entra nessa etapa, o frontend identifica campanhas ativas vinculadas e chama a Edge Function existente `generate-lead-messages`.

As mensagens retornadas sao persistidas em `generated_messages` e cada geracao automatica bem-sucedida registra uma atividade em `lead_activities`. Se uma regra de transicao bloquear a movimentacao do lead, a geracao automatica nao e executada. Se a IA ou a Edge Function falhar, a movimentacao ja concluida nao e desfeita; o usuario recebe feedback e o lead permanece na nova etapa.

## Estrutura do projeto

```txt
src/
  app/
    App.tsx
    router.tsx
  components/
    layout/
    ui/
  features/
    auth/
    campaigns/
    dashboard/
    leads/
      components/
        LeadActivitiesPanel.tsx
      hooks/
        useLeadActivities.ts
      services/
        leadActivityService.ts
    messages/
    pipeline/
    workspaces/
  lib/
    supabase/
      client.ts
    utils.ts
  pages/
  styles/
    globals.css
supabase/
  migrations/
    007_lead_activities.sql
  functions/
    generate-lead-messages/
```

### Pastas principais

- `src/features/auth`: contexto, provider, hook e service de autenticacao.
- `src/features/workspaces`: leitura de workspace atual e membros.
- `src/features/leads`: tipos, services, hooks, campos personalizados e historico de atividades do lead.
- `src/features/pipeline`: etapas do funil, regras obrigatorias e validacoes de transicao.
- `src/features/campaigns`: campanhas de abordagem.
- `src/features/messages`: mensagens geradas, chamada da Edge Function e status das mensagens.
- `src/features/dashboard`: metricas agregadas do workspace.
- `supabase/migrations`: schema SQL, RLS, triggers e tabelas.
- `supabase/functions`: Edge Functions.

## Setup local

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variaveis de ambiente do frontend

Crie um arquivo `.env` na raiz do projeto com:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Nunca coloque no frontend:

- service role key
- senha do banco
- token pessoal do Supabase
- `OPENAI_API_KEY`

### 3. Rodar o projeto

```bash
npm run dev
```

A aplicacao ficara disponivel em:

```txt
http://127.0.0.1:5173/
```

### 4. Validar build e lint

```bash
npm run lint
npm run build
```

## Supabase

### Migrations

As migrations ficam em `supabase/migrations`:

- `001_auth_workspaces.sql`: profiles, workspaces, memberships, trigger de novo usuario e RLS inicial.
- `002_leads.sql`: tabela de leads com RLS por workspace.
- `003_pipeline_stages.sql`: etapas do funil SDR e relacao com leads.
- `004_lead_assignment_and_custom_fields.sql`: responsavel do lead e campos personalizados.
- `005_campaigns.sql`: campanhas de abordagem.
- `006_generated_messages.sql`: mensagens geradas por IA.
- `007_lead_activities.sql`: historico de atividades do lead com RLS por workspace.

Para aplicar no projeto remoto:

```bash
npx supabase db push
```

### Edge Function

Function implementada:

```txt
generate-lead-messages
```

Arquivo:

```txt
supabase/functions/generate-lead-messages/index.ts
```

Deploy:

```bash
npx supabase functions deploy generate-lead-messages
```

Secrets necessarios:

```bash
npx supabase secrets set OPENAI_API_KEY=...
npx supabase secrets set OPENAI_MODEL=gpt-4o-mini
```

O valor de `OPENAI_MODEL` pode ser alterado sem mudar o frontend.

## Fluxos principais

### Autenticacao e workspace

1. Usuario cria conta.
2. Trigger `handle_new_user()` cria profile, workspace padrao e membership owner.
3. Frontend carrega o primeiro workspace disponivel como workspace atual.

### Leads e funil

1. Usuario cadastra leads no workspace.
2. Leads podem ter responsavel, campos personalizados e etapa do funil.
3. Kanban agrupa leads por `pipeline_stage_id`.
4. Movimentacao entre etapas respeita `pipeline_stages.required_fields`.
5. Criacao, edicao e mudanca de etapa geram registros no historico de atividades.

### Campanhas e IA

1. Usuario cria uma campanha ativa.
2. Campanhas podem ter uma etapa gatilho configurada.
3. Ao editar um lead, seleciona uma campanha para geracao manual.
4. Frontend chama a Edge Function `generate-lead-messages`.
5. A function busca lead e campanha, valida workspace, chama a OpenAI API e salva mensagens em `generated_messages`.
6. Usuario pode copiar, arquivar ou marcar envio simulado.
7. Envio simulado move o lead para `Tentando Contato`, respeitando regras obrigatorias da etapa.

### Geracao automatica por etapa gatilho

1. Usuario configura uma campanha ativa com etapa gatilho.
2. Usuario move um lead para a etapa gatilho.
3. O frontend valida as regras de transicao antes da movimentacao.
4. Apos a movimentacao bem-sucedida, o frontend gera mensagens automaticamente para as campanhas ativas vinculadas aquela etapa.
5. A function busca lead e campanha, valida workspace, chama a OpenAI API e salva mensagens em `generated_messages`.
6. Usuario verifica as mensagens geradas automaticamente no painel do lead.
7. Usuario verifica o registro `message_generated` no historico de atividades.
8. Se a etapa bloquear por campo obrigatorio, nenhuma mensagem automatica e gerada.

### Dashboard

O dashboard mostra metricas do workspace atual:

- total de leads;
- leads por etapa;
- campanhas totais;
- campanhas ativas;
- mensagens geradas;
- mensagens enviadas.

## Seguranca

- O frontend usa apenas `VITE_SUPABASE_ANON_KEY`.
- A service role key nunca e usada no frontend.
- RLS esta ativado nas tabelas de dominio, incluindo historico de atividades.
- Dados sao isolados por `workspace_id` e `workspace_members`.
- A chave da OpenAI fica somente em secrets da Supabase Edge Function.
- A Edge Function valida JWT, lead, campanha, workspace e membership antes de gerar mensagens.

## Diferenciais implementados

- Historico de atividades do lead.
- Geracao automatica por etapa gatilho.
- Historico de mensagens geradas.
- Regras de transicao por etapa.
- RLS robusto por workspace.

## Scripts disponiveis

```bash
npm run dev
npm run lint
npm run build
npm run preview
```

## Proximos passos

- Adicionar testes automatizados para services e regras de transicao.
- Evitar duplicidade de geracao automatica para a mesma campanha e etapa.
- Melhorar a experiencia visual do Kanban.
- Adicionar filtros avancados e paginacao em leads.
- Criar tela de detalhes dedicada do lead.
- Adicionar convites de membros para workspaces.
- Adicionar drag and drop no Kanban.
- Evoluir metricas avancadas do funil e campanhas.
- Criar camada de observabilidade para Edge Functions.

## Status da entrega

O projeto cobre o fluxo principal da prova tecnica:

1. Usuario autenticado acessa um workspace.
2. Cadastra leads e campos personalizados.
3. Organiza leads em funil Kanban.
4. Configura regras por etapa.
5. Cria campanhas.
6. Configura campanha com etapa gatilho.
7. Move lead para a etapa gatilho e gera mensagens automaticamente.
8. Verifica historico de mensagens e atividades do lead.
9. Copia ou simula envio de mensagens.
10. Acompanha metricas basicas no dashboard.
