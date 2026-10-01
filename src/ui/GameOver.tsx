import { statsFor, type GameState } from '../engine/index.ts';
import { levelTitle } from '../app/settings.ts';

type Props = { state: GameState; onAgain: () => void; onMenu: () => void; onReview: () => void };

export function GameOver({ state, onAgain, onMenu, onReview }: Props) {
  const won = state.winner === 'player';
  const you = statsFor(state.history, 'player');
  const ai = statsFor(state.history, 'ai');
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="gameover-title">
      <div className="parchment modal" data-testid="game-over">
        <p className="eyebrow">vs {levelTitle(state.level)}</p>
        <h2 id="gameover-title" className="title title-md">
          {won ? 'Victory!' : 'Defeat'}
        </h2>
        <p className="subtitle">
          {won
            ? 'The enemy fleet lies at the bottom of the sea.'
            : 'Your fleet has been sent to the depths. The enemy ships are now revealed.'}
        </p>
        <table className="stats">
          <thead>
            <tr>
              <th />
              <th>You</th>
              <th>Enemy</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th>Shots fired</th>
              <td>{you.shots}</td>
              <td>{ai.shots}</td>
            </tr>
            <tr>
              <th>Hits</th>
              <td>{you.hits}</td>
              <td>{ai.hits}</td>
            </tr>
            <tr>
              <th>Accuracy</th>
              <td>{Math.round(you.accuracy * 100)}%</td>
              <td>{Math.round(ai.accuracy * 100)}%</td>
            </tr>
            <tr>
              <th>Ships sunk</th>
              <td>{you.sunk}</td>
              <td>{ai.sunk}</td>
            </tr>
          </tbody>
        </table>
        <div className="btn-row center">
          <button type="button" className="btn btn-primary" onClick={onAgain} data-testid="play-again">
            Play again
          </button>
          <button type="button" className="btn" onClick={onReview}>
            Review the board
          </button>
          <button type="button" className="btn" onClick={onMenu}>
            Main menu
          </button>
        </div>
      </div>
    </div>
  );
}
