-- Run this in the Supabase SQL editor.
create table if not exists public.cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  name text not null check (char_length(name) between 1 and 40),
  type text not null check (type in ('Fire','Water','Grass','Electric','Psychic','Fighting','Normal','Dragon')),
  status text not null check (status in ('Got it','Want it','Trade')),
  favorite boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists cards_user_id_idx on public.cards (user_id);

alter table public.cards enable row level security;

create policy "Users read own cards" on public.cards
  for select using (auth.uid() = user_id);
create policy "Users insert own cards" on public.cards
  for insert with check (auth.uid() = user_id);
create policy "Users update own cards" on public.cards
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users delete own cards" on public.cards
  for delete using (auth.uid() = user_id);

-- Existing projects: run only this section to add quantity, condition and official card data.
alter table public.cards add column if not exists quantity integer not null default 1 check (quantity between 1 and 999);
alter table public.cards add column if not exists condition text not null default 'Near Mint' check (condition in ('Mint','Near Mint','Good','Played'));
alter table public.cards add column if not exists tcg_id text;
alter table public.cards add column if not exists set_name text;
alter table public.cards add column if not exists card_number text;
alter table public.cards add column if not exists official_rarity text;
alter table public.cards add column if not exists image_url text;
