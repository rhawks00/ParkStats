import { supabase } from './supabase';
import type { Game, PlayerGameStats, PitcherGameStats } from '../types';

export async function getUserGames(): Promise<Game[]> {
  const { data, error } = await supabase
    .from('games')
    .select('*')
    .order('game_date', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function addGame(game: Omit<Game, 'id' | 'user_id' | 'created_at'>): Promise<Game> {
  const { data, error } = await supabase
    .from('games')
    .insert(game)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function removeGame(gameId: string): Promise<void> {
  const gameRes = await supabase.from('games').select('game_pk').eq('id', gameId).single();
  const gamePk = gameRes.data?.game_pk;

  if (gamePk) {
    await supabase.from('player_game_stats').delete().eq('game_pk', gamePk);
    await supabase.from('pitcher_game_stats').delete().eq('game_pk', gamePk);
  }

  const { error } = await supabase.from('games').delete().eq('id', gameId);
  if (error) throw error;
}

export async function savePlayerStats(
  stats: Omit<PlayerGameStats, 'id' | 'user_id'>[]
): Promise<void> {
  const rows = stats.map((s) => ({
    ...s,
    hit_events: JSON.stringify(s.hit_events),
  }));

  const { error } = await supabase.from('player_game_stats').insert(rows);
  if (error) throw error;
}

export async function savePitcherStats(
  stats: Omit<PitcherGameStats, 'id' | 'user_id'>[]
): Promise<void> {
  if (!stats.length) return;
  const { error } = await supabase.from('pitcher_game_stats').insert(stats);
  if (error) throw error;
}

export async function getAllPlayerStats(): Promise<PlayerGameStats[]> {
  const { data, error } = await supabase
    .from('player_game_stats')
    .select('*');

  if (error) throw error;
  return (data || []).map((row: any) => ({
    ...row,
    errors: row.errors || 0,
    assists: row.assists || 0,
    putouts: row.putouts || 0,
    hit_events: typeof row.hit_events === 'string'
      ? JSON.parse(row.hit_events)
      : row.hit_events || [],
  }));
}

export async function getAllPitcherStats(): Promise<PitcherGameStats[]> {
  const { data, error } = await supabase
    .from('pitcher_game_stats')
    .select('*');

  if (error) throw error;
  return data || [];
}
