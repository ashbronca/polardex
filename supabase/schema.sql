-- Polardex relational schema (Supabase / Postgres)
-- Run this in the Supabase SQL editor (or `supabase db push`) on a NEW project.
-- Replaces the Firestore document collections:
--   pokemon/data      -> pokemon
--   attributes/data   -> attributes
--   cards/{cardId}    -> cards
--
-- The app's CardModel is rebuilt from a cards⨝pokemon join inside
-- useGetCardsQuery, so no UI code changes.

-- ----------------------------------------------------------------------------
-- pokemon  (was the pokemon/data map)
-- ----------------------------------------------------------------------------
create table if not exists public.pokemon (
  id         integer primary key,          -- pokédex id
  name       text not null,
  type       text,
  image_url  text,
  evolutions jsonb,                          -- { first, second?, third? } kept as-is
  meta       jsonb
);

-- ----------------------------------------------------------------------------
-- attributes  (was the attributes/data map — the dropdown option set)
-- ----------------------------------------------------------------------------
create table if not exists public.attributes (
  id   text primary key,
  type text,
  name text,
  meta jsonb
);

-- ----------------------------------------------------------------------------
-- cards  (was cards/{cardId} documents)
-- pokemonData is normalized to a pokemon_id FK; AttributeCardModel is flattened
-- into columns so set/rarity/condition become real, queryable SQL.
-- ----------------------------------------------------------------------------
create table if not exists public.cards (
  card_id      text primary key,
  pokemon_id   integer references public.pokemon(id),
  quantity     integer not null default 1,
  set_number   integer,
  status       text not null default 'owned' check (status in ('owned', 'wishlist')),
  manual_order integer,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  -- flattened AttributeCardModel
  card_type            text,
  set                  text,
  rarity               text,
  condition            text,
  grading              integer,
  is_graded            boolean,
  tcg_id               text,
  tcg_image_url        text,
  market_price         numeric,   -- USD, as upstream (never store AUD)
  variant_normal       boolean,
  variant_alternate    boolean,
  variant_reverse_holo boolean,   -- legacy compat field

  meta jsonb
);

create index if not exists cards_pokemon_id_idx on public.cards (pokemon_id);
create index if not exists cards_set_idx         on public.cards (set);
create index if not exists cards_status_idx      on public.cards (status);

-- ----------------------------------------------------------------------------
-- Realtime: let the client subscribe to card changes (replaces onSnapshot).
-- ----------------------------------------------------------------------------
alter publication supabase_realtime add table public.cards;

-- ----------------------------------------------------------------------------
-- Row-level security.
--
-- The anon key ships in the client bundle, so without RLS anyone with the key
-- can read AND write. Posture below matches today's app (no login): public
-- read + public write. TIGHTEN BEFORE CUTOVER — e.g. drop the write policies
-- and gate writes behind Supabase Auth, which maps onto the dormant login gate.
-- ----------------------------------------------------------------------------
alter table public.pokemon    enable row level security;
alter table public.attributes enable row level security;
alter table public.cards      enable row level security;

-- Public read
create policy "public read pokemon"    on public.pokemon    for select using (true);
create policy "public read attributes" on public.attributes for select using (true);
create policy "public read cards"      on public.cards      for select using (true);

-- Public write (REMOVE/restrict before this holds your real collection)
create policy "anon write pokemon"    on public.pokemon    for all using (true) with check (true);
create policy "anon write attributes" on public.attributes for all using (true) with check (true);
create policy "anon write cards"      on public.cards      for all using (true) with check (true);
