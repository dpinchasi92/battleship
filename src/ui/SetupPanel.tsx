import { FLEET, type Orientation, type Placement, type ShipType } from '../engine/index.ts';

type Props = {
  placements: readonly Placement[];
  selected: ShipType | null;
  orientation: Orientation;
  onSelect: (type: ShipType) => void;
  onRotate: () => void;
  onRandomize: () => void;
  onClear: () => void;
  onStart: () => void;
  onBack: () => void;
  ready: boolean;
};

export function SetupPanel(p: Props) {
  return (
    <div className="parchment side-panel setup-panel">
      <h2 className="panel-title">Position your fleet</h2>
      <p className="muted small">
        Pick a ship, then click the sea to place it, or steer it with the arrow keys and press <kbd>Enter</kbd> to drop anchor. Click a placed ship to move it. Press <kbd>R</kbd> to rotate.
      </p>
      <ul className="ship-list">
        {FLEET.map((spec) => {
          const placed = p.placements.some((pl) => pl.type === spec.type);
          return (
            <li key={spec.type}>
              <button
                type="button"
                className={`ship-pick ${p.selected === spec.type ? 'selected' : ''} ${placed ? 'placed' : ''}`}
                onClick={() => p.onSelect(spec.type)}
                data-testid={`pick-${spec.type}`}
                aria-pressed={p.selected === spec.type}
              >
                <span>{spec.name}</span>
                <span className="pips">
                  {Array.from({ length: spec.length }, (_, i) => (
                    <span key={i} className="pip pip-ship" />
                  ))}
                </span>
                <span className="placed-mark" aria-label={placed ? 'placed' : 'not placed'}>
                  {placed ? '⚓' : ''}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="btn-row">
        <button type="button" className="btn" onClick={p.onRotate} data-testid="rotate">
          Rotate ({p.orientation === 'h' ? 'Horizontal' : 'Vertical'})
        </button>
        <button type="button" className="btn" onClick={p.onRandomize} data-testid="randomize">
          Randomize
        </button>
        <button type="button" className="btn" onClick={p.onClear}>
          Clear
        </button>
      </div>
      <button
        type="button"
        className="btn btn-primary btn-big"
        disabled={!p.ready}
        onClick={p.onStart}
        data-testid="start-battle"
      >
        Start Battle
      </button>
      <button type="button" className="btn btn-link" onClick={p.onBack}>
        ← Back to menu
      </button>
    </div>
  );
}
