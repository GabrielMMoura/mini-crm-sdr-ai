create table if not exists public.user_llm_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'openai',
  encrypted_api_key text not null,
  api_key_last4 text not null,
  model text not null default 'gpt-4o-mini',
  is_configured boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_llm_settings_user_id_provider_key unique (user_id, provider),
  constraint user_llm_settings_provider_check check (provider in ('openai')),
  constraint user_llm_settings_model_not_empty check (length(btrim(model)) > 0),
  constraint user_llm_settings_api_key_last4_length_check check (length(api_key_last4) <= 8)
);

create index if not exists user_llm_settings_user_id_idx
  on public.user_llm_settings(user_id);

create index if not exists user_llm_settings_provider_idx
  on public.user_llm_settings(provider);

drop trigger if exists user_llm_settings_set_updated_at on public.user_llm_settings;
create trigger user_llm_settings_set_updated_at
before update on public.user_llm_settings
for each row
execute function public.set_updated_at();

alter table public.user_llm_settings enable row level security;

drop policy if exists "Users can read own llm settings" on public.user_llm_settings;
create policy "Users can read own llm settings"
on public.user_llm_settings
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can insert own llm settings" on public.user_llm_settings;
create policy "Users can insert own llm settings"
on public.user_llm_settings
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "Users can update own llm settings" on public.user_llm_settings;
create policy "Users can update own llm settings"
on public.user_llm_settings
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Users can delete own llm settings" on public.user_llm_settings;
create policy "Users can delete own llm settings"
on public.user_llm_settings
for delete
to authenticated
using (user_id = auth.uid());
