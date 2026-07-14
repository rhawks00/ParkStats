import { useState } from 'react';
import { searchGamesByDate, fetchGameStats } from '../services/mlb';
import { addGame, savePlayerStats, savePitcherStats } from '../services/db';
import type { MLBGameSearchResult } from '../types';

interface QueuedGame {
  game: MLBGameSearchResult;
  date: string;
}

interface Props {
  onClose: () => void;
  onGameAdded: () => void;
  favoriteTeam: string;
}

export function AddGameModal({ onClose, onGameAdded, favoriteTeam }: Props) {
  const [date, setDate] = useState('');
  const [results, setResults] = useState<MLBGameSearchResult[]>([]);
  const [queue, setQueue] = useState<QueuedGame[]>([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addProgress, setAddProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState('');

  const queuedDates = new Set(queue.map((q) => q.date));
  const currentDateQueued = queuedDates.has(date);

  const handleSearch = async () => {
    if (!date) return;
    setSearching(true);
    setError('');
    try {
      const games = await searchGamesByDate(date);
      setResults(games);
      if (games.length === 0) setError('No games found for that date');
    } catch {
      setError('Failed to search games');
    }
    setSearching(false);
  };

  const pickGame = (game: MLBGameSearchResult) => {
    setQueue((prev) => {
      const without = prev.filter((q) => q.date !== date);
      return [...without, { game, date }];
    });
  };

  const removeFromQueue = (gamePk: number) => {
    setQueue((prev) => prev.filter((q) => q.game.gamePk !== gamePk));
  };

  const handleAddAll = async () => {
    if (!queue.length) return;
    setAdding(true);
    setAddProgress({ done: 0, total: queue.length });
    setError('');

    let failed = 0;
    for (const { game, date: gameDate } of queue) {
      try {
        await addGame({
          game_pk: game.gamePk,
          game_date: gameDate,
          away_team: game.away.abbreviation,
          home_team: game.home.abbreviation,
          away_score: game.awayScore,
          home_score: game.homeScore,
          venue: game.venue,
        });

        const { playerStats, pitcherStats } = await fetchGameStats(game.gamePk);
        await savePlayerStats(playerStats);
        await savePitcherStats(pitcherStats);
      } catch {
        failed++;
      }
      setAddProgress((prev) => ({ ...prev, done: prev.done + 1 }));
    }

    if (failed > 0) setError(`Failed to add ${failed} game${failed > 1 ? 's' : ''}`);
    onGameAdded();
    if (failed === 0) onClose();
    setAdding(false);
  };

  const sortedResults = [...results].sort((a, b) => {
    if (!favoriteTeam) return 0;
    const aFav = a.home.abbreviation === favoriteTeam || a.away.abbreviation === favoriteTeam;
    const bFav = b.home.abbreviation === favoriteTeam || b.away.abbreviation === favoriteTeam;
    if (aFav && !bFav) return -1;
    if (!aFav && bFav) return 1;
    return 0;
  });

  const selectedPkForDate = queue.find((q) => q.date === date)?.game.gamePk ?? null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add Games</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        {/* Queue */}
        {queue.length > 0 && (
          <div className="queue-section">
            <div className="section-label">Selected ({queue.length})</div>
            <div className="queue-chips">
              {queue.map((q) => (
                <div key={q.game.gamePk} className="queue-chip">
                  <span>{q.game.away.abbreviation} @ {q.game.home.abbreviation}</span>
                  <span className="queue-chip-date">
                    {new Date(q.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                  <button className="queue-chip-remove" onClick={() => removeFromQueue(q.game.gamePk)}>&times;</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Search */}
        <div className="search-bar">
          <input
            type="date"
            value={date}
            onChange={(e) => { setDate(e.target.value); setResults([]); }}
            max={new Date().toISOString().split('T')[0]}
          />
          <button onClick={handleSearch} disabled={searching || !date}>
            {searching ? 'Searching...' : 'Search'}
          </button>
        </div>

        {error && <p className="error">{error}</p>}

        {currentDateQueued && results.length > 0 && (
          <p className="info-msg">Game selected for this date. Pick a different one to swap it.</p>
        )}

        <div className="game-results">
          {sortedResults.map((game) => {
            const isSelected = game.gamePk === selectedPkForDate;
            const isFav = favoriteTeam && (game.home.abbreviation === favoriteTeam || game.away.abbreviation === favoriteTeam);
            return (
              <div key={game.gamePk}
                className={`game-result selectable ${isSelected ? 'selected' : ''} ${isFav ? 'fav' : ''}`}
                onClick={() => !adding && pickGame(game)}>
                <div className="game-result-info">
                  <div className="game-teams">
                    <span className="team">{game.away.abbreviation}</span>
                    <span className="score">{game.awayScore} - {game.homeScore}</span>
                    <span className="team">{game.home.abbreviation}</span>
                  </div>
                  <span className="venue">{game.venue}</span>
                </div>
                {isFav && <span className="fav-badge">★</span>}
                {isSelected && <span className="queued-indicator">✓</span>}
              </div>
            );
          })}
        </div>

        {queue.length > 0 && (
          <div className="modal-footer">
            <span className="selected-count">{queue.length} game{queue.length !== 1 ? 's' : ''} ready</span>
            <button className="add-all-btn" onClick={handleAddAll} disabled={adding}>
              {adding ? `Adding ${addProgress.done}/${addProgress.total}...` : `Add ${queue.length} Game${queue.length !== 1 ? 's' : ''}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
