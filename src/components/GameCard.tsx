import type { Game } from '../types';

interface Props {
  game: Game;
  onRemove: (id: string) => void;
}

export function GameCard({ game, onRemove }: Props) {
  return (
    <div className="game-card">
      <div className="game-card-header">
        <span className="game-date">
          {new Date(game.game_date + 'T12:00:00').toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </span>
        <button
          className="remove-btn"
          onClick={() => onRemove(game.id)}
          title="Remove game"
        >
          &times;
        </button>
      </div>
      <div className="game-card-score">
        <span className="team">{game.away_team}</span>
        <span className="score">{game.away_score} - {game.home_score}</span>
        <span className="team">{game.home_team}</span>
      </div>
      <span className="venue">{game.venue}</span>
    </div>
  );
}
