-- SaqBot database. Run once: psql "$DATABASE_URL" -f db/schema.sql

create table if not exists users (
  id text primary key,                 -- Privy user id (did:privy:...)
  wallet text,                         -- trading wallet address, lowercase
  rep text,
  alerts jsonb not null default '{}'::jsonb,
  telegram_chat_id bigint unique,
  created_at timestamptz not null default now()
);

create table if not exists telegram_links (
  code text primary key,
  user_id text not null references users(id) on delete cascade,
  expires_at timestamptz not null
);

create table if not exists push_subscriptions (
  endpoint text primary key,
  user_id text not null references users(id) on delete cascade,
  subscription jsonb not null,
  created_at timestamptz not null default now()
);

-- Scheduled market events. Past rows are kept: they're what star ratings are computed from.
create table if not exists market_events (
  id serial primary key,
  type text not null,
  title text not null,
  detail text,
  coin text,
  starts_at timestamptz not null
);
create index if not exists market_events_starts_at on market_events (starts_at);

create table if not exists event_ratings (
  type text primary key,
  stars int not null,
  avg_move_pct numeric not null,
  samples int not null,
  updated_at timestamptz not null default now()
);

-- Prevents sending the same alert twice.
create table if not exists alerts_sent (
  key text primary key,
  sent_at timestamptz not null default now()
);
