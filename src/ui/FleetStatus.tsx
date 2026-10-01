import { FLEET, isShipSunk, shipCells, toIndex, type Board } from '../engine/index.ts';

type Props = { title: string; board: Board; own: boolean };

export function FleetStatus({ title, board, own }: Props) {
  return (
    <div className="fleet-status">
      <h3 className="panel-heading">{title}</h3>
      <ul>
        {FLEET.map((spec) => {
          const placement = board.placements.find((p) => p.type === spec.type)!;
          const sunk = isShipSunk(board, placement);
          const hits = shipCells(placement).filter((c) => board.shots[toIndex(c)]).length;
          return (
            <li key={spec.type} className={sunk ? 'sunk' : ''} data-testid={`fleet-${own ? 'own' : 'enemy'}-${spec.type}`}>
              <span className="ship-name">{spec.name}</span>
              <span className="pips" aria-label={sunk ? 'sunk' : own ? `${hits} of ${spec.length} hit` : 'afloat'}>
                {Array.from({ length: spec.length }, (_, i) => (
                  <span key={i} className={`pip ${sunk || (own && i < hits) ? 'pip-hit' : ''}`} />
                ))}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
