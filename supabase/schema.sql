-- Polardex relational schema (Supabase / Postgres)
-- Run this in the Supabase SQL editor on a NEW project (or to RESET — the
-- drops below wipe existing tables, so don't run it once it holds real data).
--
-- Replaces the Firestore document collections:
--   attributes/data   -> attributes
--   cards/{cardId}    -> cards
--
-- NOTE on pokemon: the source `pokemon/data` doc is empty and every card's
-- pokemonData.id is 0 — i.e. pokemon is per-card data, not a shared entity.
-- So pokemon fields are denormalized onto `cards` (as Firestore stored them).
-- The `pokemon` table is kept (empty) only for the unused useGetPokemonQuery
-- hook / possible future species metadata.

drop table if exists public.cards cascade;
drop table if exists public.attributes cascade;
drop table if exists public.pokemon cascade;

-- ----------------------------------------------------------------------------
-- pokemon  (reserved; currently empty — see note above)
-- ----------------------------------------------------------------------------
create table public.pokemon (
  id         integer primary key,
  name       text not null,
  type       text,
  image_url  text,
  evolutions jsonb,
  meta       jsonb
);

-- ----------------------------------------------------------------------------
-- attributes  (was the attributes/data map — the dropdown option set)
-- ----------------------------------------------------------------------------
create table public.attributes (
  id   text primary key,
  type text,
  name text,
  meta jsonb
);

-- ----------------------------------------------------------------------------
-- cards  (was cards/{cardId} documents)
-- AttributeCardModel is flattened into columns so set/rarity/condition become
-- real, queryable SQL. pokemonData is denormalized onto the card.
-- ----------------------------------------------------------------------------
create table public.cards (
  card_id      text primary key,
  quantity     integer not null default 1,
  set_number   integer,
  status       text not null default 'owned' check (status in ('owned', 'wishlist')),
  manual_order integer,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  -- denormalized pokemonData (PokemonModel)
  pokemon_id         integer,        -- pokédex id (0 in current data; no FK)
  pokemon_name       text,
  pokemon_type       text,
  pokemon_image_url  text,
  pokemon_evolutions jsonb,

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

create index cards_set_idx          on public.cards (set);
create index cards_status_idx       on public.cards (status);
create index cards_pokemon_name_idx on public.cards (pokemon_name);

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
