import { useState } from 'react';
import type { PlayerGameStats, LeaderboardEntry } from '../types';

type StatKey = 'home_runs' | 'stolen_bases' | 'hits' | 'doubles' | 'triples' | 'rbis' | 'strikeouts' | 'walks';

const STAT_LABELS: Record<StatKey, string> = {
  home_runs: 'Home Runs',
  stolen_bases: 'Stolen Bases',
  hits: 'Hits',
  doubles: 'Doubles',
  triples: 'Triples',
  rbis: 'RBIs',
  strikeouts: 'Strikeouts',
  walks: 'Walks',
};

interface Props {
  stats: PlayerGameStats[];
  onPlayerClick: (playerId: number) => void;
}

export function Leaderboard({ stats, onPlayerClick }: Props) {
  const [activeStat, setActiveStat] = useState<StatKey>('home_runs');

  const leaderboard = buildLeaderboard(stats, activeStat);

  return (
    <div className="leaderboard">
      <div className="stat-tabs">
        {Object.entries(STAT_LABELS).map(([key, label]) => (
          <button
            key={key}
            className={`stat-tab ${activeStat === key ? 'active' : ''}`}
            onClick={() => setActiveStat(key as StatKey)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="leaderboard-list">
        {leaderboard.slice(0, 15).map((entry, i) => (
          <div
            key={entry.player_id}
            className="leaderboard-row"
            onClick={() => onPlayerClick(entry.player_id)}
          >
            <span className="rank">{i + 1}</span>
            <div className="player-info">
              <span className="player-name">{entry.player_name}</span>
              <span className="player-team">{entry.team}</span>
            </div>
            <span className="stat-value">{entry.value}</span>
            <span className="games-count">{entry.games}g</span>
          </div>
        ))}
        {leaderboard.length === 0 && (
          <p className="empty-state">Add some games to see leaderboards</p>
        )}
      </div>
    </div>
  );
}

function buildLeaderboard(stats: PlayerGameStats[], stat: StatKey): LeaderboardEntry[] {
  const map = new Map<number, LeaderboardEntry>();

  for (const s of stats) {
    const existing = map.get(s.player_id);
    if (existing) {
      existing.value += s[stat];
      existing.games += 1;
    } else {
      map.set(s.player_id, {
        player_id: s.player_id,
        player_name: s.player_name,
        team: s.team,
        value: s[stat],
        games: 1,
      });
    }
  }

  return Array.from(map.values())
    .filter((e) => e.value > 0)
    .sort((a, b) => b.value - a.value);
}
