import type { PlayerGameStats, HitEvent } from '../types';
import { SprayChart } from './SprayChart';

interface Props {
  playerId: number;
  stats: PlayerGameStats[];
  onClose: () => void;
}

export function PlayerDetail({ playerId, stats, onClose }: Props) {
  const playerStats = stats.filter((s) => s.player_id === playerId);
  if (!playerStats.length) return null;

  const name = playerStats[0].player_name;
  const team = playerStats[0].team;

  const totals = playerStats.reduce(
    (acc, s) => ({
      hits: acc.hits + s.hits,
      at_bats: acc.at_bats + s.at_bats,
      home_runs: acc.home_runs + s.home_runs,
      doubles: acc.doubles + s.doubles,
      triples: acc.triples + s.triples,
      rbis: acc.rbis + s.rbis,
      stolen_bases: acc.stolen_bases + s.stolen_bases,
      strikeouts: acc.strikeouts + s.strikeouts,
      walks: acc.walks + s.walks,
    }),
    { hits: 0, at_bats: 0, home_runs: 0, doubles: 0, triples: 0, rbis: 0, stolen_bases: 0, strikeouts: 0, walks: 0 }
  );

  const avg = totals.at_bats > 0 ? (totals.hits / totals.at_bats).toFixed(3) : '.000';
  const obp = totals.at_bats + totals.walks > 0
    ? ((totals.hits + totals.walks) / (totals.at_bats + totals.walks)).toFixed(3)
    : '.000';
  const slg = totals.at_bats > 0
    ? (((totals.hits - totals.doubles - totals.triples - totals.home_runs) +
        totals.doubles * 2 + totals.triples * 3 + totals.home_runs * 4) /
        totals.at_bats).toFixed(3)
    : '.000';

  const allHitEvents: HitEvent[] = playerStats.flatMap((s) => s.hit_events);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal player-detail" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>{name}</h2>
            <span className="player-team-label">{team} &middot; {playerStats.length} game{playerStats.length > 1 ? 's' : ''}</span>
          </div>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="player-stats-grid">
          <div className="stat-box">
            <span className="stat-label">AVG</span>
            <span className="stat-val">{avg}</span>
          </div>
          <div className="stat-box">
            <span className="stat-label">OBP</span>
            <span className="stat-val">{obp}</span>
          </div>
          <div className="stat-box">
            <span className="stat-label">SLG</span>
            <span className="stat-val">{slg}</span>
          </div>
          <div className="stat-box">
            <span className="stat-label">HR</span>
            <span className="stat-val">{totals.home_runs}</span>
          </div>
          <div className="stat-box">
            <span className="stat-label">SB</span>
            <span className="stat-val">{totals.stolen_bases}</span>
          </div>
          <div className="stat-box">
            <span className="stat-label">RBI</span>
            <span className="stat-val">{totals.rbis}</span>
          </div>
          <div className="stat-box">
            <span className="stat-label">H</span>
            <span className="stat-val">{totals.hits}</span>
          </div>
          <div className="stat-box">
            <span className="stat-label">AB</span>
            <span className="stat-val">{totals.at_bats}</span>
          </div>
        </div>

        {allHitEvents.length > 0 && (
          <div className="spray-section">
            <h3>Spray Chart</h3>
            <SprayChart events={allHitEvents} />
          </div>
        )}

        <div className="game-log">
          <h3>Game Log</h3>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>AB</th>
                <th>H</th>
                <th>HR</th>
                <th>RBI</th>
                <th>SB</th>
                <th>K</th>
                <th>BB</th>
              </tr>
            </thead>
            <tbody>
              {playerStats.map((s) => (
                <tr key={s.game_pk}>
                  <td>{s.game_pk}</td>
                  <td>{s.at_bats}</td>
                  <td>{s.hits}</td>
                  <td>{s.home_runs}</td>
                  <td>{s.rbis}</td>
                  <td>{s.stolen_bases}</td>
                  <td>{s.strikeouts}</td>
                  <td>{s.walks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
