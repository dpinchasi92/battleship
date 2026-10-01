import { useRef, type KeyboardEvent } from 'react';
import { BOARD_SIZE, coordLabel, rowLabel, shipSpec, toIndex, type Coord } from '../engine/index.ts';
import type { CellView, Ghost } from '../app/cells.ts';

type Props = {
  label: string;
  views: readonly CellView[];
  interactive: boolean;
  onCell?: (coord: Coord) => void;
  onHover?: (coord: Coord | null) => void;
  ghost?: Ghost | null;
  heat?: readonly number[] | null;
  highlight?: Coord | null;
  hint?: Coord | null;
  cursor?: Coord | null;
  onCursor?: (coord: Coord) => void;
  testId: string;
};

const describe = (view: CellView) => {
  switch (view.visual) {
    case 'sea':
      return 'open sea';
    case 'ship':
      return view.ship ? `your ${shipSpec(view.ship).name}` : 'ship';
    case 'miss':
      return 'miss';
    case 'hit':
      return 'hit';
    case 'sunk':
      return view.ship ? `sunk ${shipSpec(view.ship).name}` : 'sunk';
  }
};

/** Accessible 2D "chart table" board: a roving-tabindex grid of buttons. */
export function Board2D({
  label,
  views,
  interactive,
  onCell,
  onHover,
  ghost,
  heat,
  highlight,
  hint,
  cursor,
  onCursor,
  testId,
}: Props) {
  const gridRef = useRef<HTMLDivElement>(null);
  const ghostSet = new Set(ghost?.cells.map(toIndex));
  const focusIndex = cursor ? toIndex(cursor) : 0;

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, coord: Coord) => {
    const moves: Record<string, [number, number]> = {
      ArrowUp: [-1, 0],
      ArrowDown: [1, 0],
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1],
    };
    const move = moves[e.key];
    if (!move) return;
    e.preventDefault();
    const next = {
      row: Math.min(BOARD_SIZE - 1, Math.max(0, coord.row + move[0])),
      col: Math.min(BOARD_SIZE - 1, Math.max(0, coord.col + move[1])),
    };
    onCursor?.(next);
    onHover?.(next);
    const button = gridRef.current?.querySelector<HTMLButtonElement>(`[data-index="${toIndex(next)}"]`);
    button?.focus();
  };

  return (
    <div className="board2d" data-testid={testId}>
      <div className="board2d-title">{label}</div>
      <div ref={gridRef} className="board2d-frame" role="grid" aria-label={label}>
        <div />
        {Array.from({ length: BOARD_SIZE }, (_, c) => (
          <div key={c} className="board2d-axis" aria-hidden>
            {c + 1}
          </div>
        ))}
        {Array.from({ length: BOARD_SIZE }, (_, r) => (
          <div key={r} className="contents" role="row">
            <div className="board2d-axis" aria-hidden>
              {rowLabel(r)}
            </div>
            {Array.from({ length: BOARD_SIZE }, (_, c) => {
              const coord = { row: r, col: c };
              const index = toIndex(coord);
              const view = views[index]!;
              const h = heat?.[index] ?? 0;
              const classes = [
                'cell',
                `cell-${view.visual}`,
                ghostSet.has(index) ? (ghost?.valid ? 'cell-ghost' : 'cell-ghost-bad') : '',
                highlight && toIndex(highlight) === index ? 'cell-highlight' : '',
                hint && toIndex(hint) === index ? 'cell-hint' : '',
              ].join(' ');
              return (
                <button
                  key={c}
                  type="button"
                  role="gridcell"
                  data-index={index}
                  data-testid={`${testId}-${coordLabel(coord)}`}
                  data-state={view.visual}
                  className={classes}
                  style={h > 0 ? { ['--heat' as string]: h.toFixed(3) } : undefined}
                  tabIndex={index === focusIndex ? 0 : -1}
                  aria-label={`${coordLabel(coord)}, ${describe(view)}`}
                  aria-disabled={!interactive || (view.visual !== 'sea' && view.visual !== 'ship') || undefined}
                  onClick={() => interactive && onCell?.(coord)}
                  onMouseEnter={() => onHover?.(coord)}
                  onFocus={() => {
                    onCursor?.(coord);
                    onHover?.(coord);
                  }}
                  onKeyDown={(e) => onKeyDown(e, coord)}
                >
                  {h > 0 && <span className="cell-heat" />}
                  {view.visual === 'miss' && <span className="peg peg-miss" aria-hidden />}
                  {(view.visual === 'hit' || view.visual === 'sunk') && <span className="peg peg-hit" aria-hidden />}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
