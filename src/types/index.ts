export interface Game {
  id: string;
  user_id: string;
  game_pk: number;
  game_date: string;
  away_team: string;
  home_team: string;
  away_score: number;
  home_score: number;
  venue: string;
  created_at: string;
}

export interface PlayerGameStats {
  id: string;
  user_id: string;
  game_pk: number;
  player_id: number;
  player_name: string;
  team: string;
  hits: number;
  at_bats: number;
  home_runs: number;
  doubles: number;
  triples: number;
  rbis: number;
  stolen_bases: number;
  strikeouts: number;
  walks: number;
  hit_events: HitEvent[];
}

export interface PitcherGameStats {
  id: string;
  user_id: string;
  game_pk: number;
  player_id: number;
  player_name: string;
  team: string;
  innings_pitched: number;
  hits_allowed: number;
  runs_allowed: number;
  earned_runs: number;
  walks_allowed: number;
  strikeouts_pitched: number;
  home_runs_allowed: number;
  pitches_thrown: number;
  win: boolean;
  loss: boolean;
  save: boolean;
  is_starter: boolean;
}

export interface HitEvent {
  type: 'single' | 'double' | 'triple' | 'home_run' | 'flyout' | 'groundout' | 'out';
  description: string;
  coord_x: number;
  coord_y: number;
}

export interface MLBGameSearchResult {
  gamePk: number;
  gameDate: string;
  away: { id: number; name: string; abbreviation: string };
  home: { id: number; name: string; abbreviation: string };
  venue: string;
  status: string;
  awayScore: number;
  homeScore: number;
}

export interface LeaderboardEntry {
  player_id: number;
  player_name: string;
  team: string;
  value: number;
  games: number;
}
