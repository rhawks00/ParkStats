-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor > New Query)

-- Games table
create table games (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null default auth.uid(),
  game_pk integer not null,
  game_date text not null,
  away_team text not null,
  home_team text not null,
  away_score integer not null default 0,
  home_score integer not null default 0,
  venue text not null,
  created_at timestamptz default now(),
  unique(user_id, game_pk)
);

-- Player stats per game
create table player_game_stats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null default auth.uid(),
  game_pk integer not null,
  player_id integer not null,
  player_name text not null,
  team text not null,
  hits integer not null default 0,
  at_bats integer not null default 0,
  home_runs integer not null default 0,
  doubles integer not null default 0,
  triples integer not null default 0,
  rbis integer not null default 0,
  stolen_bases integer not null default 0,
  strikeouts integer not null default 0,
  walks integer not null default 0,
  hit_events jsonb default '[]'::jsonb
);

-- Pitcher stats per game
create table pitcher_game_stats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null default auth.uid(),
  game_pk integer not null,
  player_id integer not null,
  player_name text not null,
  team text not null,
  innings_pitched real not null default 0,
  hits_allowed integer not null default 0,
  runs_allowed integer not null default 0,
  earned_runs integer not null default 0,
  walks_allowed integer not null default 0,
  strikeouts_pitched integer not null default 0,
  home_runs_allowed integer not null default 0,
  pitches_thrown integer not null default 0,
  win boolean not null default false,
  loss boolean not null default false,
  save boolean not null default false,
  is_starter boolean not null default false
);

-- Row Level Security: users can only see/modify their own data
alter table games enable row level security;
alter table player_game_stats enable row level security;
alter table pitcher_game_stats enable row level security;

create policy "Users can view their own games"
  on games for select using (auth.uid() = user_id);

create policy "Users can insert their own games"
  on games for insert with check (auth.uid() = user_id);

create policy "Users can delete their own games"
  on games for delete using (auth.uid() = user_id);

create policy "Users can view their own stats"
  on player_game_stats for select using (auth.uid() = user_id);

create policy "Users can insert their own stats"
  on player_game_stats for insert with check (auth.uid() = user_id);

create policy "Users can delete their own stats"
  on player_game_stats for delete using (auth.uid() = user_id);

create policy "Users can view their own pitcher stats"
  on pitcher_game_stats for select using (auth.uid() = user_id);

create policy "Users can insert their own pitcher stats"
  on pitcher_game_stats for insert with check (auth.uid() = user_id);

create policy "Users can delete their own pitcher stats"
  on pitcher_game_stats for delete using (auth.uid() = user_id);

-- Indexes for fast queries
create index idx_games_user on games(user_id);
create index idx_stats_user on player_game_stats(user_id);
create index idx_stats_game on player_game_stats(game_pk);
create index idx_stats_player on player_game_stats(player_id);
create index idx_pitcher_user on pitcher_game_stats(user_id);
create index idx_pitcher_game on pitcher_game_stats(game_pk);
