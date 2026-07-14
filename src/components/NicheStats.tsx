import type { PlayerGameStats, Game } from '../types';

interface Props {
  stats: PlayerGameStats[];
  games: Game[];
}

export function NicheStats({ stats, games }: Props) {
  if (!stats.length) return null;

  const record = games.reduce(
    (acc, g) => {
      if (g.home_score > g.away_score) acc.homeWins++;
      else acc.awayWins++;
      return acc;
    },
    { homeWins: 0, awayWins: 0 }
  );

  const totalHRs = stats.reduce((sum, s) => sum + s.home_runs, 0);
  const totalSBs = stats.reduce((sum, s) => sum + s.stolen_bases, 0);
  const totalHits = stats.reduce((sum, s) => sum + s.hits, 0);
  const totalKs = stats.reduce((sum, s) => sum + s.strikeouts, 0);

  const mostHRPlayer = findTopPlayer(stats, 'home_runs');
  const mostSBPlayer = findTopPlayer(stats, 'stolen_bases');
  const mostHitsPlayer = findTopPlayer(stats, 'hits');

  return (
    <div className="niche-stats">
      <h3>Your Baseball Life</h3>
      <div className="niche-grid">
        <div className="niche-card">
          <span className="niche-value">{games.length}</span>
          <span className="niche-label">Games Attended</span>
        </div>
        <div className="niche-card">
          <span className="niche-value">{record.homeWins}-{record.awayWins}</span>
          <span className="niche-label">Home W-L Record</span>
        </div>
        <div className="niche-card">
          <span className="niche-value">{totalHRs}</span>
          <span className="niche-label">Home Runs Witnessed</span>
        </div>
        <div className="niche-card">
          <span className="niche-value">{totalSBs}</span>
          <span className="niche-label">Stolen Bases Seen</span>
        </div>
        <div className="niche-card">
          <span className="niche-value">{totalHits}</span>
          <span className="niche-label">Total Hits</span>
        </div>
        <div className="niche-card">
          <span className="niche-value">{totalKs}</span>
          <span className="niche-label">Strikeouts Watched</span>
        </div>
        {mostHRPlayer && (
          <div className="niche-card highlight">
            <span className="niche-value">{mostHRPlayer.name}</span>
            <span className="niche-label">
              Most HRs in Your Games ({mostHRPlayer.value})
            </span>
          </div>
        )}
        {mostSBPlayer && (
          <div className="niche-card highlight">
            <span className="niche-value">{mostSBPlayer.name}</span>
            <span className="niche-label">
              Most SBs in Your Games ({mostSBPlayer.value})
            </span>
          </div>
        )}
        {mostHitsPlayer && (
          <div className="niche-card highlight">
            <span className="niche-value">{mostHitsPlayer.name}</span>
            <span className="niche-label">
              Most Hits in Your Games ({mostHitsPlayer.value})
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function findTopPlayer(
  stats: PlayerGameStats[],
  key: 'home_runs' | 'stolen_bases' | 'hits'
): { name: string; value: number } | null {
  const map = new Map<number, { name: string; value: number }>();

  for (const s of stats) {
    const existing = map.get(s.player_id);
    if (existing) {
      existing.value += s[key];
    } else {
      map.set(s.player_id, { name: s.player_name, value: s[key] });
    }
  }

  const entries = Array.from(map.values()).filter((e) => e.value > 0);
  if (!entries.length) return null;
  return entries.sort((a, b) => b.value - a.value)[0];
}
