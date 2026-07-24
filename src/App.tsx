import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './hooks/useAuth';
import { getUserGames, removeGame, getAllPlayerStats, getAllPitcherStats } from './services/db';
import { AuthForm } from './components/AuthForm';
import { AddGameModal } from './components/AddGameModal';
import { SprayChart } from './components/SprayChart';
import type { Game, PlayerGameStats, PitcherGameStats, HitEvent } from './types';
import './App.css';

const MLB_TEAMS = [
  'ARI','ATL','BAL','BOS','CHC','CIN','CLE','COL','CWS','DET',
  'HOU','KC','LAA','LAD','MIA','MIL','MIN','NYM','NYY','OAK',
  'PHI','PIT','SD','SEA','SF','STL','TB','TEX','TOR','WSH',
];

type View = 'leaderboard' | 'spray' | 'pitching' | 'teams';
type BatCat = 'hr' | 'sb' | 'hits' | 'singles' | 'doubles' | 'triples' | 'rbi' | 'bb' | 'avg' | 'obp' | 'slg' | 'ops' | 'krate' | 'bbrate';
type PitchCat = 'strikeouts' | 'wins' | 'era' | 'whip' | 'k9' | 'innings' | 'saves';

const BAT_CATS: { id: BatCat; label: string; color: string; key: string }[] = [
  { id: 'hr', label: 'HR', color: '#ef4444', key: 'hr' },
  { id: 'sb', label: 'SB', color: '#a855f7', key: 'sb' },
  { id: 'hits', label: 'H', color: '#22c55e', key: 'hits' },
  { id: 'singles', label: '1B', color: '#10b981', key: 'singles' },
  { id: 'doubles', label: '2B', color: '#3b82f6', key: 'doubles' },
  { id: 'triples', label: '3B', color: '#f59e0b', key: 'triples' },
  { id: 'rbi', label: 'RBI', color: '#f97316', key: 'rbis' },
  { id: 'bb', label: 'BB', color: '#14b8a6', key: 'walks' },
  { id: 'avg', label: 'AVG', color: '#06b6d4', key: 'avg' },
  { id: 'obp', label: 'OBP', color: '#818cf8', key: 'obp' },
  { id: 'slg', label: 'SLG', color: '#fb923c', key: 'slg' },
  { id: 'ops', label: 'OPS', color: '#f59e0b', key: 'ops' },
  { id: 'krate', label: 'K%', color: '#f43f5e', key: 'krate' },
  { id: 'bbrate', label: 'BB%', color: '#2dd4bf', key: 'bbrate' },
];

const PITCH_CATS: { id: PitchCat; label: string; color: string }[] = [
  { id: 'strikeouts', label: 'K', color: '#ef4444' },
  { id: 'wins', label: 'W', color: '#22c55e' },
  { id: 'era', label: 'ERA', color: '#06b6d4' },
  { id: 'whip', label: 'WHIP', color: '#818cf8' },
  { id: 'k9', label: 'K/9', color: '#f43f5e' },
  { id: 'innings', label: 'IP', color: '#f59e0b' },
  { id: 'saves', label: 'SV', color: '#a855f7' },
];

function StatBar({ label, value, max, color }: { label: string; value: string | number; max: number; color: string }) {
  const numVal = typeof value === 'string' ? parseFloat(value) || 0 : value;
  const pct = max > 0 ? (numVal / max) * 100 : 0;
  return (
    <div className="stat-bar">
      <div className="stat-bar-label" title={label}>{label}</div>
      <div className="stat-bar-track">
        <div className="stat-bar-fill" style={{ width: `${Math.max(pct, 4)}%`, background: color }} />
      </div>
      <div className="stat-bar-value">{value}</div>
    </div>
  );
}

function App() {
  const { user, loading, signOut, supabaseConfigured } = useAuth();
  const [games, setGames] = useState<Game[]>([]);
  const [stats, setStats] = useState<PlayerGameStats[]>([]);
  const [pitcherStats, setPitcherStats] = useState<PitcherGameStats[]>([]);
  const [showAddGame, setShowAddGame] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  const [selectedGameIds, setSelectedGameIds] = useState<Set<string>>(new Set());
  const [view, setView] = useState<View>('leaderboard');
  const [batCat, setBatCat] = useState<BatCat>('hr');
  const [pitchCat, setPitchCat] = useState<PitchCat>('strikeouts');
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [selectedPlayer, setSelectedPlayer] = useState<number | null>(null);
  const [favoriteTeam, setFavoriteTeam] = useState<string>(() => localStorage.getItem('parkstats_fav_team') || '');
  const [showFavPicker, setShowFavPicker] = useState(false);
  const [gamesExpanded, setGamesExpanded] = useState(false);
  const [leaderboardCount, setLeaderboardCount] = useState(10);

  const loadData = useCallback(async () => {
    setLoadingData(true);
    try {
      const [g, s, p] = await Promise.all([getUserGames(), getAllPlayerStats(), getAllPitcherStats()]);
      setGames(g);
      setStats(s);
      setPitcherStats(p);
      setSelectedGameIds(new Set(g.map((game) => game.id)));
    } catch (e) {
      console.error('Failed to load data:', e);
    }
    setLoadingData(false);
  }, []);

  useEffect(() => {
    if (user) loadData();
  }, [user, loadData]);

  const selectedGamePks = useMemo(() => {
    return new Set(games.filter((g) => selectedGameIds.has(g.id)).map((g) => g.game_pk));
  }, [games, selectedGameIds]);

  const filteredStats = useMemo(() => stats.filter((s) => selectedGamePks.has(s.game_pk)), [stats, selectedGamePks]);
  const filteredPitchers = useMemo(() => pitcherStats.filter((s) => selectedGamePks.has(s.game_pk)), [pitcherStats, selectedGamePks]);

  const gameDateMap = useMemo(() => {
    const m: Record<number, string> = {};
    for (const g of games) m[g.game_pk] = g.game_date;
    return m;
  }, [games]);

  const playerMap = useMemo(() => {
    const map: Record<number, { name: string; team: string; latestDate: string; games: Set<number>; hr: number; sb: number; hits: number; doubles: number; triples: number; singles: number; at_bats: number; walks: number; strikeouts: number; rbis: number }> = {};
    for (const s of filteredStats) {
      if (!map[s.player_id]) {
        map[s.player_id] = { name: s.player_name, team: s.team, latestDate: '', games: new Set(), hr: 0, sb: 0, hits: 0, doubles: 0, triples: 0, singles: 0, at_bats: 0, walks: 0, strikeouts: 0, rbis: 0 };
      }
      const p = map[s.player_id];
      const gameDate = gameDateMap[s.game_pk] || '';
      if (gameDate > p.latestDate) {
        p.latestDate = gameDate;
        p.team = s.team;
      }
      p.games.add(s.game_pk);
      p.hr += s.home_runs;
      p.sb += s.stolen_bases;
      p.hits += s.hits;
      p.doubles += s.doubles;
      p.triples += s.triples;
      p.singles += s.hits - s.doubles - s.triples - s.home_runs;
      p.at_bats += s.at_bats;
      p.walks += s.walks;
      p.strikeouts += s.strikeouts;
      p.rbis += s.rbis;
    }
    return map;
  }, [filteredStats, gameDateMap]);

  const pitcherMap = useMemo(() => {
    const map: Record<number, { name: string; team: string; latestDate: string; games: number; ip: number; k: number; wins: number; losses: number; er: number; saves: number; pitches: number; ha: number; bb: number; hra: number; starter: boolean }> = {};
    for (const s of filteredPitchers) {
      if (!map[s.player_id]) {
        map[s.player_id] = { name: s.player_name, team: s.team, latestDate: '', games: 0, ip: 0, k: 0, wins: 0, losses: 0, er: 0, saves: 0, pitches: 0, ha: 0, bb: 0, hra: 0, starter: false };
      }
      const p = map[s.player_id];
      const gameDate = gameDateMap[s.game_pk] || '';
      if (gameDate > p.latestDate) {
        p.latestDate = gameDate;
        p.team = s.team;
      }
      p.games++;
      p.ip += s.innings_pitched;
      p.k += s.strikeouts_pitched;
      p.wins += s.win ? 1 : 0;
      p.losses += s.loss ? 1 : 0;
      p.er += s.earned_runs;
      p.saves += s.save ? 1 : 0;
      p.pitches += s.pitches_thrown;
      p.ha += s.hits_allowed;
      p.bb += s.walks_allowed;
      p.hra += s.home_runs_allowed;
      if (s.is_starter) p.starter = true;
    }
    return map;
  }, [filteredPitchers, gameDateMap]);

  // Qualification thresholds: 1 PA per game for rate batting stats, 10% of total IP for ERA
  const totalGamesSelected = selectedGameIds.size;
  const minPA = Math.max(Math.floor(totalGamesSelected / 2), 1);
  const isRateStat = (cat: BatCat) => ['avg', 'obp', 'slg', 'ops', 'krate', 'bbrate'].includes(cat);

  const batLeaderboard = useMemo(() => {
    const entries = Object.entries(playerMap);
    const catInfo = BAT_CATS.find((c) => c.id === batCat)!;

    if (isRateStat(batCat)) {
      return entries
        .filter(([, p]) => (p.at_bats + p.walks) >= minPA)
        .map(([id, p]) => {
          const pa = p.at_bats + p.walks;
          const avg = p.at_bats > 0 ? p.hits / p.at_bats : 0;
          const obp = pa > 0 ? (p.hits + p.walks) / pa : 0;
          const slg = p.at_bats > 0 ? (p.singles + p.doubles * 2 + p.triples * 3 + p.hr * 4) / p.at_bats : 0;
          const ops = obp + slg;
          const krate = pa > 0 ? p.strikeouts / pa : 0;
          const bbrate = pa > 0 ? p.walks / pa : 0;
          const val = batCat === 'avg' ? avg : batCat === 'obp' ? obp : batCat === 'slg' ? slg : batCat === 'ops' ? ops : batCat === 'krate' ? krate : bbrate;
          const isPct = batCat === 'krate' || batCat === 'bbrate';
          const display = isPct ? (val * 100).toFixed(1) + '%' : val.toFixed(3).replace(/^0/, '');
          return { id: Number(id), name: p.name, team: p.team, val, display };
        })
        .sort((a, b) => batCat === 'krate' ? a.val - b.val : b.val - a.val)
        .slice(0, leaderboardCount);
    }

    return entries
      .map(([id, p]) => {
        const val = (p as any)[catInfo.key] || 0;
        return { id: Number(id), name: p.name, team: p.team, val, display: String(val) };
      })
      .filter((e) => e.val > 0)
      .sort((a, b) => b.val - a.val)
      .slice(0, leaderboardCount);
  }, [playerMap, batCat, minPA, leaderboardCount]);

  const pitchLeaderboard = useMemo(() => {
    const entries = Object.entries(pitcherMap);

    if (pitchCat === 'era') {
      return entries
        .filter(([, p]) => p.starter && p.ip > 0)
        .map(([id, p]) => ({ id: Number(id), name: p.name, team: p.team, val: (p.er / p.ip) * 9, display: ((p.er / p.ip) * 9).toFixed(2) }))
        .sort((a, b) => a.val - b.val)
        .slice(0, leaderboardCount);
    }

    if (pitchCat === 'whip') {
      return entries
        .filter(([, p]) => p.starter && p.ip > 0)
        .map(([id, p]) => ({ id: Number(id), name: p.name, team: p.team, val: (p.bb + p.ha) / p.ip, display: ((p.bb + p.ha) / p.ip).toFixed(2) }))
        .sort((a, b) => a.val - b.val)
        .slice(0, leaderboardCount);
    }

    if (pitchCat === 'k9') {
      return entries
        .filter(([, p]) => p.ip > 0)
        .map(([id, p]) => ({ id: Number(id), name: p.name, team: p.team, val: (p.k / p.ip) * 9, display: ((p.k / p.ip) * 9).toFixed(1) }))
        .sort((a, b) => b.val - a.val)
        .slice(0, leaderboardCount);
    }

    const keyMap: Record<string, string> = { strikeouts: 'k', wins: 'wins', innings: 'ip', saves: 'saves' };
    const key = keyMap[pitchCat];

    return entries
      .map(([id, p]) => {
        const val = (p as any)[key] || 0;
        return { id: Number(id), name: p.name, team: p.team, val, display: pitchCat === 'innings' ? val.toFixed(1) : String(val) };
      })
      .filter((e) => e.val > 0)
      .sort((a, b) => b.val - a.val)
      .slice(0, leaderboardCount);
  }, [pitcherMap, pitchCat, leaderboardCount]);

  const teamsInGames = useMemo(() => {
    const teams = new Set<string>();
    for (const p of Object.values(playerMap)) teams.add(p.team);
    return Array.from(teams).sort();
  }, [playerMap]);

  const playersForTeam = useMemo(() => {
    if (!selectedTeam) return [];
    return Object.entries(playerMap)
      .filter(([, p]) => p.team === selectedTeam)
      .sort(([, a], [, b]) => a.name.localeCompare(b.name));
  }, [playerMap, selectedTeam]);

  const selectedPlayerData = useMemo(() => {
    if (selectedPlayer === null) return null;
    const p = playerMap[selectedPlayer];
    if (!p) return null;
    const allEvents: HitEvent[] = filteredStats
      .filter((s) => s.player_id === selectedPlayer)
      .flatMap((s) => s.hit_events);
    const pa = p.at_bats + p.walks;
    const avg = p.at_bats > 0 ? (p.hits / p.at_bats).toFixed(3).replace(/^0/, '') : '.000';
    const obp = pa > 0 ? ((p.hits + p.walks) / pa).toFixed(3).replace(/^0/, '') : '.000';
    const slg = p.at_bats > 0 ? ((p.singles + p.doubles * 2 + p.triples * 3 + p.hr * 4) / p.at_bats).toFixed(3).replace(/^0/, '') : '.000';
    const opsVal = (parseFloat(obp) + parseFloat(slg));
    const ops = opsVal.toFixed(3).replace(/^0/, '');
    return { ...p, avg, obp, slg, ops, events: allEvents, gameCount: p.games.size };
  }, [selectedPlayer, playerMap, filteredStats]);

  const toggleGame = (id: string) => {
    setSelectedGameIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleRemoveGame = async (gameId: string) => {
    await removeGame(gameId);
    loadData();
  };

  const totalHRs = filteredStats.reduce((sum, s) => sum + s.home_runs, 0);
  const totalSBs = filteredStats.reduce((sum, s) => sum + s.stolen_bases, 0);
  const totalKs = filteredPitchers.reduce((sum, s) => sum + s.strikeouts_pitched, 0);

  const teamsSeenCount = useMemo(() => {
    const teams = new Set<string>();
    for (const g of games) {
      if (selectedGameIds.has(g.id)) {
        teams.add(g.away_team);
        teams.add(g.home_team);
      }
    }
    return teams.size;
  }, [games, selectedGameIds]);

  const venuesSeenCount = useMemo(() => {
    const venues = new Set<string>();
    for (const g of games) {
      if (selectedGameIds.has(g.id)) {
        venues.add(g.venue);
      }
    }
    return venues.size;
  }, [games, selectedGameIds]);

  const mostGamesSeen = useMemo(() => {
    const entries = Object.values(playerMap);
    if (!entries.length) return null;
    const top = entries.sort((a, b) => b.games.size - a.games.size)[0];
    return `${top.name} (${top.games.size})`;
  }, [playerMap]);

  const highestSlg = useMemo(() => {
    const entries = Object.values(playerMap).filter((p) => (p.at_bats + p.walks) >= minPA);
    if (!entries.length) return null;
    const withSlg = entries.map((p) => ({ ...p, slg: (p.singles + p.doubles * 2 + p.triples * 3 + p.hr * 4) / p.at_bats }));
    const top = withSlg.sort((a, b) => b.slg - a.slg)[0];
    return `${top.name} (${top.slg.toFixed(3)})`;
  }, [playerMap]);

  const multiHRGames = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of filteredStats) {
      if (s.home_runs >= 2) {
        counts[s.player_name] = (counts[s.player_name] || 0) + 1;
      }
    }
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    if (!entries.length) return null;
    return `${entries[0][0]} (${entries[0][1]})`;
  }, [filteredStats]);

  const goldenSombreros = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of filteredStats) {
      if (s.strikeouts >= 4) {
        counts[s.player_name] = (counts[s.player_name] || 0) + 1;
      }
    }
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    if (!entries.length) return null;
    return `${entries[0][0]} (${entries[0][1]})`;
  }, [filteredStats]);

  const clutchHitter = useMemo(() => {
    const closeGamePks = new Set(
      games.filter((g) => selectedGameIds.has(g.id) && Math.abs(g.home_score - g.away_score) <= 2).map((g) => g.game_pk)
    );
    const closeStats = filteredStats.filter((s) => closeGamePks.has(s.game_pk));
    const map: Record<string, { name: string; hits: number; ab: number }> = {};
    for (const s of closeStats) {
      if (!map[s.player_id]) map[s.player_id] = { name: s.player_name, hits: 0, ab: 0 };
      map[s.player_id].hits += s.hits;
      map[s.player_id].ab += s.at_bats;
    }
    const entries = Object.values(map).filter((p) => p.ab >= 5);
    if (!entries.length) return null;
    const top = entries.sort((a, b) => (b.hits / b.ab) - (a.hits / a.ab))[0];
    return `${top.name} (${(top.hits / top.ab).toFixed(3)})`;
  }, [filteredStats, games, selectedGameIds]);

  const selectedGames = useMemo(() => games.filter((g) => selectedGameIds.has(g.id)), [games, selectedGameIds]);

  const longestStreak = useMemo(() => {
    if (!selectedGames.length) return 0;
    const dates = [...new Set(selectedGames.map((g) => g.game_date))].sort();
    let max = 1, cur = 1;
    for (let i = 1; i < dates.length; i++) {
      const prev = new Date(dates[i - 1] + 'T12:00:00');
      const next = new Date(dates[i] + 'T12:00:00');
      const diff = (next.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
      if (diff === 1) { cur++; max = Math.max(max, cur); }
      else { cur = 1; }
    }
    return max;
  }, [selectedGames]);

  const busiestMonth = useMemo(() => {
    if (!selectedGames.length) return null;
    const months: Record<string, number> = {};
    for (const g of selectedGames) {
      const d = new Date(g.game_date + 'T12:00:00');
      const key = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      months[key] = (months[key] || 0) + 1;
    }
    const top = Object.entries(months).sort((a, b) => b[1] - a[1])[0];
    return `${top[0]} (${top[1]})`;
  }, [selectedGames]);

  const biggestBlowout = useMemo(() => {
    if (!selectedGames.length) return null;
    const top = [...selectedGames].sort((a, b) => Math.abs(b.home_score - b.away_score) - Math.abs(a.home_score - a.away_score))[0];
    const diff = Math.abs(top.home_score - top.away_score);
    return `${top.away_team} ${top.away_score}–${top.home_score} ${top.home_team} (${diff} runs)`;
  }, [selectedGames]);

  const closestGame = useMemo(() => {
    if (!selectedGames.length) return null;
    const top = [...selectedGames].sort((a, b) => Math.abs(a.home_score - a.away_score) - Math.abs(b.home_score - b.away_score))[0];
    return `${top.away_team} ${top.away_score}–${top.home_score} ${top.home_team}`;
  }, [selectedGames]);

  const totalRuns = useMemo(() => selectedGames.reduce((sum, g) => sum + g.home_score + g.away_score, 0), [selectedGames]);

  const luckyTeam = useMemo(() => {
    if (!selectedGames.length) return null;
    const record: Record<string, { w: number; l: number }> = {};
    for (const g of selectedGames) {
      const winner = g.home_score > g.away_score ? g.home_team : g.away_team;
      const loser = g.home_score > g.away_score ? g.away_team : g.home_team;
      if (g.home_score === g.away_score) continue;
      if (!record[winner]) record[winner] = { w: 0, l: 0 };
      if (!record[loser]) record[loser] = { w: 0, l: 0 };
      record[winner].w++;
      record[loser].l++;
    }
    const entries = Object.entries(record).filter(([, r]) => (r.w + r.l) >= 3);
    if (!entries.length) return null;
    const top = entries.sort((a, b) => (b[1].w / (b[1].w + b[1].l)) - (a[1].w / (a[1].w + a[1].l)))[0];
    const pct = (top[1].w / (top[1].w + top[1].l) * 100).toFixed(0);
    return `${top[0]} (${top[1].w}-${top[1].l}, ${pct}%)`;
  }, [selectedGames]);

  const mostCommonMatchup = useMemo(() => {
    if (!selectedGames.length) return null;
    const matchups: Record<string, number> = {};
    for (const g of selectedGames) {
      const key = [g.away_team, g.home_team].sort().join(' vs ');
      matchups[key] = (matchups[key] || 0) + 1;
    }
    const top = Object.entries(matchups).sort((a, b) => b[1] - a[1])[0];
    return `${top[0]} (${top[1]}x)`;
  }, [selectedGames]);

  const favoriteDayOfWeek = useMemo(() => {
    if (!selectedGames.length) return null;
    const days: Record<string, number> = {};
    for (const g of selectedGames) {
      const day = new Date(g.game_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' });
      days[day] = (days[day] || 0) + 1;
    }
    const top = Object.entries(days).sort((a, b) => b[1] - a[1])[0];
    return `${top[0]} (${top[1]})`;
  }, [selectedGames]);

  type TeamSort = 'games' | 'winPct' | 'avg' | 'hr' | 'era' | 'rpg';
  const [teamSort, setTeamSort] = useState<TeamSort>('games');

  const teamStats = useMemo(() => {
    const teams: Record<string, {
      games: number; wins: number; losses: number; ties: number;
      rs: number; ra: number;
      ab: number; hits: number; hr: number; doubles: number; triples: number; singles: number; walks: number; sb: number; rbis: number; strikeouts: number;
      ip: number; er: number; kPitched: number; bbAllowed: number;
      bestGame: { desc: string; margin: number } | null;
      mvp: { name: string; val: number } | null;
      bestStarter: { name: string; desc: string } | null;
    }> = {};

    for (const g of selectedGames) {
      for (const team of [g.home_team, g.away_team]) {
        if (!teams[team]) {
          teams[team] = { games: 0, wins: 0, losses: 0, ties: 0, rs: 0, ra: 0, ab: 0, hits: 0, hr: 0, doubles: 0, triples: 0, singles: 0, walks: 0, sb: 0, rbis: 0, strikeouts: 0, ip: 0, er: 0, kPitched: 0, bbAllowed: 0, bestGame: null, mvp: null, bestStarter: null };
        }
        const t = teams[team];
        t.games++;
        const isHome = team === g.home_team;
        const teamScore = isHome ? g.home_score : g.away_score;
        const oppScore = isHome ? g.away_score : g.home_score;
        t.rs += teamScore;
        t.ra += oppScore;
        if (teamScore > oppScore) t.wins++;
        else if (teamScore < oppScore) t.losses++;
        else t.ties++;

        const totalRuns = g.home_score + g.away_score;
        if (!t.bestGame || totalRuns > t.bestGame.margin) {
          t.bestGame = { desc: `${g.away_team} ${g.away_score}–${g.home_score} ${g.home_team}`, margin: totalRuns };
        }
      }
    }

    for (const s of filteredStats) {
      const t = teams[s.team];
      if (!t) continue;
      t.ab += s.at_bats;
      t.hits += s.hits;
      t.hr += s.home_runs;
      t.doubles += s.doubles;
      t.triples += s.triples;
      t.singles += s.hits - s.doubles - s.triples - s.home_runs;
      t.walks += s.walks;
      t.sb += s.stolen_bases;
      t.rbis += s.rbis;
      t.strikeouts += s.strikeouts;
    }

    for (const s of filteredPitchers) {
      const t = teams[s.team];
      if (!t) continue;
      t.ip += s.innings_pitched;
      t.er += s.earned_runs;
      t.kPitched += s.strikeouts_pitched;
      t.bbAllowed += s.walks_allowed;
    }

    // MVP per team: highest OPS with min 3 AB
    const playersByTeam: Record<string, Record<number, { name: string; ab: number; hits: number; walks: number; singles: number; doubles: number; triples: number; hr: number }>> = {};
    for (const s of filteredStats) {
      if (!playersByTeam[s.team]) playersByTeam[s.team] = {};
      const pm = playersByTeam[s.team];
      if (!pm[s.player_id]) pm[s.player_id] = { name: s.player_name, ab: 0, hits: 0, walks: 0, singles: 0, doubles: 0, triples: 0, hr: 0 };
      const p = pm[s.player_id];
      p.ab += s.at_bats;
      p.hits += s.hits;
      p.walks += s.walks;
      p.singles += s.hits - s.doubles - s.triples - s.home_runs;
      p.doubles += s.doubles;
      p.triples += s.triples;
      p.hr += s.home_runs;
    }
    for (const [team, players] of Object.entries(playersByTeam)) {
      const t = teams[team];
      if (!t) continue;
      const qualified = Object.values(players).filter(p => p.ab >= 3);
      if (qualified.length) {
        const best = qualified.sort((a, b) => {
          const opsA = (a.ab > 0 ? (a.hits + a.walks) / (a.ab + a.walks) : 0) + (a.ab > 0 ? (a.singles + a.doubles * 2 + a.triples * 3 + a.hr * 4) / a.ab : 0);
          const opsB = (b.ab > 0 ? (b.hits + b.walks) / (b.ab + b.walks) : 0) + (b.ab > 0 ? (b.singles + b.doubles * 2 + b.triples * 3 + b.hr * 4) / b.ab : 0);
          return opsB - opsA;
        })[0];
        const ops = (best.ab > 0 ? (best.hits + best.walks) / (best.ab + best.walks) : 0) + (best.ab > 0 ? (best.singles + best.doubles * 2 + best.triples * 3 + best.hr * 4) / best.ab : 0);
        t.mvp = { name: best.name, val: ops };
      }
    }

    // Best starter per team
    const startersByTeam: Record<string, { name: string; ip: number; er: number; k: number }[]> = {};
    for (const s of filteredPitchers) {
      if (!s.is_starter) continue;
      if (!startersByTeam[s.team]) startersByTeam[s.team] = [];
      startersByTeam[s.team].push({ name: s.player_name, ip: s.innings_pitched, er: s.earned_runs, k: s.strikeouts_pitched });
    }
    for (const [team, starters] of Object.entries(startersByTeam)) {
      const t = teams[team];
      if (!t) continue;
      const best = starters.filter(s => s.ip > 0).sort((a, b) => {
        const eraA = (a.er / a.ip) * 9;
        const eraB = (b.er / b.ip) * 9;
        if (eraA !== eraB) return eraA - eraB;
        return b.ip - a.ip;
      })[0];
      if (best) {
        const era = ((best.er / best.ip) * 9).toFixed(2);
        t.bestStarter = { name: best.name, desc: `${best.ip.toFixed(1)} IP, ${era} ERA, ${best.k} K` };
      }
    }

    const result = Object.entries(teams).map(([abbr, t]) => {
      const avg = t.ab > 0 ? t.hits / t.ab : 0;
      const pa = t.ab + t.walks;
      const obp = pa > 0 ? (t.hits + t.walks) / pa : 0;
      const slg = t.ab > 0 ? (t.singles + t.doubles * 2 + t.triples * 3 + t.hr * 4) / t.ab : 0;
      const ops = obp + slg;
      const era = t.ip > 0 ? (t.er / t.ip) * 9 : 0;
      const rpg = t.games > 0 ? t.rs / t.games : 0;
      const rapg = t.games > 0 ? t.ra / t.games : 0;
      const winPct = (t.wins + t.losses) > 0 ? t.wins / (t.wins + t.losses) : 0;
      return { abbr, ...t, avg, obp, slg, ops, era, rpg, rapg, winPct };
    });

    const sortFns: Record<TeamSort, (a: typeof result[0], b: typeof result[0]) => number> = {
      games: (a, b) => b.games - a.games,
      winPct: (a, b) => b.winPct - a.winPct,
      avg: (a, b) => b.avg - a.avg,
      hr: (a, b) => b.hr - a.hr,
      era: (a, b) => a.era - b.era,
      rpg: (a, b) => b.rpg - a.rpg,
    };

    return result.sort(sortFns[teamSort]);
  }, [selectedGames, filteredStats, filteredPitchers, teamSort]);

  if (loading) {
    return <div className="app loading-screen"><div className="spinner" /></div>;
  }

  if (!user) {
    return (
      <div className="app login-screen">
        <div className="login-card">
          <h1>ParkStats</h1>
          <p>Track the players and stats from every MLB game you've attended</p>
          {supabaseConfigured ? <AuthForm /> : (
            <p className="setup-notice">Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in a .env file to enable auth.</p>
          )}
        </div>
        <footer className="site-footer">
          Built by <a href="https://ryanhawks.com" target="_blank" rel="noopener noreferrer">Ryan Hawks</a>
        </footer>
      </div>
    );
  }

  return (
    <div className="app">
      {/* Header */}
      <header>
        <div className="header-top">
          <h1>ParkStats</h1>
          <div className="header-badges">
            <span className="header-badge">{selectedGameIds.size} game{selectedGameIds.size !== 1 ? 's' : ''}</span>
            <span className="header-badge">{teamsSeenCount}/30 teams</span>
            <span className="header-badge">{venuesSeenCount}/30 parks</span>
          </div>
        </div>
        <div className="header-actions">
          <div className="fav-team-area">
            {favoriteTeam ? (
              <button className="fav-team-btn" onClick={() => setShowFavPicker(!showFavPicker)} title="Favorite team">
                ★ {favoriteTeam}
              </button>
            ) : (
              <button className="fav-team-btn dim" onClick={() => setShowFavPicker(!showFavPicker)}>
                Set Fav Team
              </button>
            )}
            {showFavPicker && (
              <div className="fav-picker">
                <select value={favoriteTeam} onChange={(e) => {
                  setFavoriteTeam(e.target.value);
                  localStorage.setItem('parkstats_fav_team', e.target.value);
                  setShowFavPicker(false);
                }}>
                  <option value="">None</option>
                  {MLB_TEAMS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            )}
          </div>
          <button className="add-game-btn" onClick={() => setShowAddGame(true)}>+ Add Game</button>
          <button className="sign-out-btn" onClick={signOut}>Sign Out</button>
        </div>
      </header>

      <main>
        {loadingData ? <div className="spinner" /> : (
          <>
            {/* Game selector */}
            <div className="game-selector">
              <button className="games-toggle" onClick={() => setGamesExpanded(!gamesExpanded)}>
                <span className="section-label" style={{ marginBottom: 0 }}>Games Attended ({games.length})</span>
                <span className={`toggle-arrow ${gamesExpanded ? 'open' : ''}`}>▸</span>
              </button>
              {gamesExpanded && (
                <div className="game-years">
                  {(() => {
                    const byYear: Record<string, typeof games> = {};
                    for (const g of games) {
                      const yr = g.game_date.slice(0, 4);
                      (byYear[yr] ??= []).push(g);
                    }
                    return Object.entries(byYear).sort((a, b) => b[0].localeCompare(a[0])).map(([year, yGames]) => (
                      <div key={year} className="game-year-group">
                        <div className="game-year-label">{year}</div>
                        <div className="game-chips">
                          {yGames.map((g) => {
                            const active = selectedGameIds.has(g.id);
                            return (
                              <div key={g.id} className={`game-chip ${active ? 'active' : ''}`}>
                                <button className="game-chip-body" onClick={() => toggleGame(g.id)}>
                                  <div className="game-chip-title">{g.away_team} @ {g.home_team}</div>
                                  <div className="game-chip-sub">
                                    {new Date(g.game_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {g.away_score}–{g.home_score}
                                  </div>
                                </button>
                                <button className="game-chip-remove" onClick={() => handleRemoveGame(g.id)} title="Remove game">&times;</button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ));
                  })()}
                  {games.length === 0 && (
                    <button className="game-chip add" onClick={() => setShowAddGame(true)}>+ Add your first game</button>
                  )}
                </div>
              )}
            </div>

            {/* Tabs */}
            <div className="tab-bar">
              {([['leaderboard', 'Hitting'], ['pitching', 'Pitching'], ['teams', 'Team Stats'], ['spray', 'Spray Charts']] as [View, string][]).map(([id, label]) => (
                <button key={id} className={`tab ${view === id ? 'active' : ''}`}
                  onClick={() => { setView(id); if (id !== 'spray') setSelectedPlayer(null); }}>
                  {label}
                </button>
              ))}
            </div>

            {/* LEADERBOARD VIEW */}
            {view === 'leaderboard' && (
              <div>
                <div className="cat-pills-row">
                  <div className="cat-pills">
                    {BAT_CATS.map((c) => (
                      <button key={c.id} className={`cat-pill ${batCat === c.id ? 'active' : ''}`}
                        style={batCat === c.id ? { background: c.color + '22', borderColor: c.color, color: c.color } : {}}
                        onClick={() => setBatCat(c.id)}>
                        {c.label}
                      </button>
                    ))}
                  </div>
                  <select className="cat-select" value={batCat} onChange={(e) => setBatCat(e.target.value as BatCat)}>
                    {BAT_CATS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                  <select className="count-select" value={leaderboardCount} onChange={(e) => setLeaderboardCount(Number(e.target.value))}>
                    <option value={10}>Top 10</option>
                    <option value={25}>Top 25</option>
                    <option value={50}>Top 50</option>
                  </select>
                </div>

                <div className="panel">
                  <h3 className="panel-title" style={{ color: BAT_CATS.find((c) => c.id === batCat)!.color }}>
                    {({ hr: 'HR', sb: 'Stolen Base', hits: 'Hit', singles: 'Singles', doubles: 'Doubles', triples: 'Triples', rbi: 'RBI', bb: 'Walk', avg: 'Batting Average', obp: 'On-Base Pct', slg: 'Slugging Pct', ops: 'OPS', krate: 'Strikeout Rate', bbrate: 'Walk Rate' } as Record<string, string>)[batCat]} Leaders (Your Games)
                    {isRateStat(batCat) && (
                      <span className="info-tip">
                        i
                        <span className="info-tip-text">Qualified: min {minPA} PA (half of {totalGamesSelected} games selected)</span>
                      </span>
                    )}
                  </h3>
                  {batLeaderboard.length === 0 && <div className="empty-msg">No data for selected games</div>}
                  {batLeaderboard.map((entry, i) => (
                    <div key={entry.id} className="leader-row" onClick={() => { setSelectedTeam(entry.team); setSelectedPlayer(entry.id); setView('spray'); }}>
                      <span className="leader-rank">{i + 1}.</span>
                      <div style={{ flex: 1 }}>
                        <StatBar
                          label={`${entry.name} (${entry.team})`}
                          value={entry.display}
                          max={batCat === 'krate' ? (batLeaderboard[batLeaderboard.length - 1]?.val || 1) * 100 : batCat === 'bbrate' ? (batLeaderboard[0]?.val || 1) * 100 : batCat === 'avg' ? 0.45 : batCat === 'obp' ? 0.55 : (batLeaderboard[0]?.val || 1)}
                          color={BAT_CATS.find((c) => c.id === batCat)!.color}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Fun facts */}
                <div className="facts-grid">
                  <div className="fact-card">
                    <div className="fact-label">Most games seen</div>
                    <div className="fact-value" style={{ color: '#818cf8' }}>{mostGamesSeen || '—'}</div>
                  </div>
                  <div className="fact-card">
                    <div className="fact-label">Highest SLG</div>
                    <div className="fact-value" style={{ color: '#fb923c' }}>{highestSlg || '—'}</div>
                  </div>
                  <div className="fact-card">
                    <div className="fact-label">Total HRs witnessed</div>
                    <div className="fact-value" style={{ color: '#ef4444' }}>{totalHRs}</div>
                  </div>
                  <div className="fact-card">
                    <div className="fact-label">Total SBs witnessed</div>
                    <div className="fact-value" style={{ color: '#a855f7' }}>{totalSBs}</div>
                  </div>
                  <div className="fact-card">
                    <div className="fact-label">Total Ks pitched</div>
                    <div className="fact-value" style={{ color: '#ef4444' }}>{totalKs}</div>
                  </div>
                  <div className="fact-card">
                    <div className="fact-label">Most multi-HR games</div>
                    <div className="fact-value" style={{ color: '#f97316' }}>{multiHRGames || '—'}</div>
                  </div>
                  <div className="fact-card">
                    <div className="fact-label">Best clutch hitter</div>
                    <div className="fact-value" style={{ color: '#22c55e' }}>{clutchHitter || '—'}</div>
                  </div>
                  <div className="fact-card">
                    <div className="fact-label">Golden Sombreros</div>
                    <div className="fact-value" style={{ color: '#eab308' }}>{goldenSombreros || '—'}</div>
                  </div>
                  <div className="fact-card">
                    <div className="fact-label">Longest streak</div>
                    <div className="fact-value" style={{ color: '#06b6d4' }}>{longestStreak} day{longestStreak !== 1 ? 's' : ''}</div>
                  </div>
                  <div className="fact-card">
                    <div className="fact-label">Busiest month</div>
                    <div className="fact-value" style={{ color: '#8b5cf6' }}>{busiestMonth || '—'}</div>
                  </div>
                  <div className="fact-card">
                    <div className="fact-label">Biggest blowout</div>
                    <div className="fact-value" style={{ color: '#f43f5e' }}>{biggestBlowout || '—'}</div>
                  </div>
                  <div className="fact-card">
                    <div className="fact-label">Closest game</div>
                    <div className="fact-value" style={{ color: '#14b8a6' }}>{closestGame || '—'}</div>
                  </div>
                  <div className="fact-card">
                    <div className="fact-label">Total runs witnessed</div>
                    <div className="fact-value" style={{ color: '#f59e0b' }}>{totalRuns}</div>
                  </div>
                  <div className="fact-card">
                    <div className="fact-label">Lucky team</div>
                    <div className="fact-value" style={{ color: '#22d3ee' }}>{luckyTeam || '—'}</div>
                  </div>
                  <div className="fact-card">
                    <div className="fact-label">Most common matchup</div>
                    <div className="fact-value" style={{ color: '#a78bfa' }}>{mostCommonMatchup || '—'}</div>
                  </div>
                  <div className="fact-card">
                    <div className="fact-label">Favorite day</div>
                    <div className="fact-value" style={{ color: '#fb7185' }}>{favoriteDayOfWeek || '—'}</div>
                  </div>
                </div>
              </div>
            )}

            {/* PITCHING VIEW */}
            {view === 'pitching' && (
              <div>
                <div className="cat-pills-row">
                  <div className="cat-pills">
                    {PITCH_CATS.map((c) => (
                      <button key={c.id} className={`cat-pill ${pitchCat === c.id ? 'active' : ''}`}
                        style={pitchCat === c.id ? { background: c.color + '22', borderColor: c.color, color: c.color } : {}}
                        onClick={() => setPitchCat(c.id)}>
                        {c.label}
                      </button>
                    ))}
                  </div>
                  <select className="cat-select" value={pitchCat} onChange={(e) => setPitchCat(e.target.value as PitchCat)}>
                    {PITCH_CATS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                  <select className="count-select" value={leaderboardCount} onChange={(e) => setLeaderboardCount(Number(e.target.value))}>
                    <option value={10}>Top 10</option>
                    <option value={25}>Top 25</option>
                    <option value={50}>Top 50</option>
                  </select>
                </div>

                <div className="panel">
                  <h3 className="panel-title" style={{ color: PITCH_CATS.find((c) => c.id === pitchCat)!.color }}>
                    {{ strikeouts: 'Strikeout', wins: 'Win', era: 'ERA', whip: 'WHIP', k9: 'K/9', innings: 'Innings Pitched', saves: 'Save' }[pitchCat]} Leaders (Your Games)
                    {(pitchCat === 'era' || pitchCat === 'whip') && (
                      <span className="info-tip">
                        i
                        <span className="info-tip-text">Starting pitchers only</span>
                      </span>
                    )}
                  </h3>
                  {pitchLeaderboard.length === 0 && <div className="empty-msg">No pitching data for selected games</div>}
                  {pitchLeaderboard.map((entry, i) => (
                    <div key={entry.id} className="leader-row">
                      <span className="leader-rank">{i + 1}.</span>
                      <div style={{ flex: 1 }}>
                        <StatBar
                          label={`${entry.name} (${entry.team})`}
                          value={entry.display}
                          max={(pitchCat === 'era' || pitchCat === 'whip') ? pitchLeaderboard[pitchLeaderboard.length - 1]?.val || 1 : pitchLeaderboard[0]?.val || 1}
                          color={PITCH_CATS.find((c) => c.id === pitchCat)!.color}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TEAM STATS VIEW */}
            {view === 'teams' && (
              <div>
                <div className="team-sort-row">
                  <span className="section-label" style={{ marginBottom: 0 }}>Sort by</span>
                  <div className="cat-pills">
                    {([['games', 'Games'], ['winPct', 'Win %'], ['rpg', 'R/G'], ['avg', 'AVG'], ['hr', 'HR'], ['era', 'ERA']] as [TeamSort, string][]).map(([id, label]) => (
                      <button key={id} className={`cat-pill ${teamSort === id ? 'active' : ''}`}
                        style={teamSort === id ? { background: '#3b82f622', borderColor: '#3b82f6', color: '#3b82f6' } : {}}
                        onClick={() => setTeamSort(id)}>
                        {label}
                      </button>
                    ))}
                  </div>
                  <select className="cat-select" value={teamSort} onChange={(e) => setTeamSort(e.target.value as TeamSort)}>
                    {[['games', 'Games'], ['winPct', 'Win %'], ['rpg', 'R/G'], ['avg', 'AVG'], ['hr', 'HR'], ['era', 'ERA']].map(([id, label]) => (
                      <option key={id} value={id}>{label}</option>
                    ))}
                  </select>
                </div>

                {teamStats.length === 0 && <div className="panel"><div className="empty-msg">No team data for selected games</div></div>}

                <div className="team-cards">
                  {teamStats.map((t) => (
                    <div key={t.abbr} className="team-card">
                      <div className="team-card-header">
                        <span className="team-card-abbr">{t.abbr}</span>
                        <span className="team-card-record">
                          {t.wins}-{t.losses}{t.ties > 0 ? `-${t.ties}` : ''}
                          {(t.wins + t.losses) > 0 && <span className="team-card-pct"> ({(t.winPct * 100).toFixed(0)}%)</span>}
                        </span>
                      </div>

                      <div className="team-card-section">
                        <div className="team-card-section-title">Overview</div>
                        <div className="team-stat-grid">
                          <div className="team-stat"><div className="team-stat-val">{t.games}</div><div className="team-stat-label">Games</div></div>
                          <div className="team-stat"><div className="team-stat-val" style={{ color: '#22c55e' }}>{t.rpg.toFixed(1)}</div><div className="team-stat-label">R/G</div></div>
                          <div className="team-stat"><div className="team-stat-val" style={{ color: '#ef4444' }}>{t.rapg.toFixed(1)}</div><div className="team-stat-label">RA/G</div></div>
                          <div className="team-stat"><div className="team-stat-val" style={{ color: '#f59e0b' }}>{t.rs}</div><div className="team-stat-label">Runs</div></div>
                        </div>
                      </div>

                      <div className="team-card-section">
                        <div className="team-card-section-title">Batting</div>
                        <div className="team-stat-grid">
                          <div className="team-stat"><div className="team-stat-val" style={{ color: '#06b6d4' }}>{t.avg.toFixed(3).replace(/^0/, '')}</div><div className="team-stat-label">AVG</div></div>
                          <div className="team-stat"><div className="team-stat-val" style={{ color: '#818cf8' }}>{t.obp.toFixed(3).replace(/^0/, '')}</div><div className="team-stat-label">OBP</div></div>
                          <div className="team-stat"><div className="team-stat-val" style={{ color: '#fb923c' }}>{t.slg.toFixed(3).replace(/^0/, '')}</div><div className="team-stat-label">SLG</div></div>
                          <div className="team-stat"><div className="team-stat-val" style={{ color: '#ef4444' }}>{t.hr}</div><div className="team-stat-label">HR</div></div>
                          <div className="team-stat"><div className="team-stat-val">{t.hits}</div><div className="team-stat-label">H</div></div>
                          <div className="team-stat"><div className="team-stat-val" style={{ color: '#a855f7' }}>{t.sb}</div><div className="team-stat-label">SB</div></div>
                        </div>
                        {t.mvp && (
                          <div className="team-card-highlight">
                            <span className="team-highlight-label">MVP</span>
                            <span className="team-highlight-val">{t.mvp.name} <span style={{ color: '#f59e0b' }}>({t.mvp.val.toFixed(3)} OPS)</span></span>
                          </div>
                        )}
                      </div>

                      <div className="team-card-section">
                        <div className="team-card-section-title">Pitching</div>
                        <div className="team-stat-grid">
                          <div className="team-stat"><div className="team-stat-val" style={{ color: '#06b6d4' }}>{t.era.toFixed(2)}</div><div className="team-stat-label">ERA</div></div>
                          <div className="team-stat"><div className="team-stat-val" style={{ color: '#ef4444' }}>{t.kPitched}</div><div className="team-stat-label">K</div></div>
                          <div className="team-stat"><div className="team-stat-val" style={{ color: '#14b8a6' }}>{t.bbAllowed}</div><div className="team-stat-label">BB</div></div>
                          <div className="team-stat"><div className="team-stat-val">{t.ip.toFixed(1)}</div><div className="team-stat-label">IP</div></div>
                        </div>
                        {t.bestStarter && (
                          <div className="team-card-highlight">
                            <span className="team-highlight-label">Best Start</span>
                            <span className="team-highlight-val">{t.bestStarter.name} <span style={{ color: '#22c55e' }}>({t.bestStarter.desc})</span></span>
                          </div>
                        )}
                      </div>

                      {t.bestGame && (
                        <div className="team-card-section">
                          <div className="team-card-highlight">
                            <span className="team-highlight-label">Best Game</span>
                            <span className="team-highlight-val">{t.bestGame.desc}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SPRAY CHART VIEW */}
            {view === 'spray' && (
              <div>
                <div className="player-select-area">
                  <div className="select-row">
                    <div>
                      <label className="section-label">Team</label>
                      <select className="player-select" value={selectedTeam}
                        onChange={(e) => { setSelectedTeam(e.target.value); setSelectedPlayer(null); }}>
                        <option value="">Choose a team...</option>
                        {teamsInGames.map((team) => (
                          <option key={team} value={team}>{team}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="section-label">Player</label>
                      <select className="player-select" value={selectedPlayer ?? ''} disabled={!selectedTeam}
                        onChange={(e) => setSelectedPlayer(e.target.value ? Number(e.target.value) : null)}>
                        <option value="">Choose a player...</option>
                        {playersForTeam.map(([id, p]) => (
                          <option key={id} value={id}>{p.name} — {p.games.size}g</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {selectedPlayerData ? (
                  <div className="spray-layout">
                    <div className="panel spray-panel">
                      <div className="spray-header">
                        <div>
                          <h3 className="panel-player-name">{selectedPlayerData.name}</h3>
                          <div className="panel-player-sub">{selectedPlayerData.team} · {selectedPlayerData.gameCount} game{selectedPlayerData.gameCount !== 1 ? 's' : ''} attended</div>
                        </div>
                        <div className="player-big-stats">
                          <div className="big-stat"><div className="big-stat-val" style={{ color: '#06b6d4' }}>{selectedPlayerData.avg}</div><div className="big-stat-label">AVG</div></div>
                          <div className="big-stat"><div className="big-stat-val" style={{ color: '#818cf8' }}>{selectedPlayerData.obp}</div><div className="big-stat-label">OBP</div></div>
                          <div className="big-stat"><div className="big-stat-val" style={{ color: '#fb923c' }}>{selectedPlayerData.slg}</div><div className="big-stat-label">SLG</div></div>
                          <div className="big-stat"><div className="big-stat-val" style={{ color: '#f59e0b' }}>{selectedPlayerData.ops}</div><div className="big-stat-label">OPS</div></div>
                          <div className="big-stat"><div className="big-stat-val" style={{ color: '#ef4444' }}>{selectedPlayerData.hr}</div><div className="big-stat-label">HR</div></div>
                        </div>
                      </div>
                      <SprayChart events={selectedPlayerData.events} />
                    </div>

                    <div className="panel">
                      <h4 className="panel-section-title">Play Log</h4>
                      <div className="play-log">
                        {filteredStats
                          .filter((s) => s.player_id === selectedPlayer)
                          .flatMap((s) => {
                            const game = games.find((g) => g.game_pk === s.game_pk);
                            const dateStr = game ? new Date(game.game_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
                            return s.hit_events.map((e, i) => ({ ...e, dateStr, key: `${s.game_pk}-${i}` }));
                          })
                          .map((play) => (
                            <div key={play.key} className="play-log-row">
                              <span className="play-date">{play.dateStr}</span>
                              <span className={`play-badge play-badge-${play.type}`}>
                                {play.type === 'home_run' ? 'HR' : play.type === 'triple' ? '3B' : play.type === 'double' ? '2B' : play.type === 'single' ? '1B' : play.type === 'flyout' ? 'FO' : play.type === 'groundout' ? 'GO' : 'Out'}
                              </span>
                              <span className="play-desc">{play.description}</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="panel empty-panel">
                    Pick a player above to see their spray chart and stats from games you attended
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {showAddGame && <AddGameModal onClose={() => setShowAddGame(false)} onGameAdded={loadData} favoriteTeam={favoriteTeam} />}

      <footer className="site-footer">
        Built by <a href="https://ryanhawks.com" target="_blank" rel="noopener noreferrer">Ryan Hawks</a>
      </footer>
    </div>
  );
}

export default App;
