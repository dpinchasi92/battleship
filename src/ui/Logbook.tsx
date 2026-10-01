import type { TurnRecord } from '../engine/index.ts';
import { turnText } from '../app/text.ts';

export function Logbook({ history }: { history: readonly TurnRecord[] }) {
  const entries = history.map((t, i) => ({ ...t, n: i + 1 })).reverse().slice(0, 40);
  return (
    <div className="logbook">
      <h3 className="panel-heading">Captain's Log</h3>
      {entries.length === 0 ? (
        <p className="muted">The sea is calm. Fire when ready.</p>
      ) : (
        <ol>
          {entries.map((t) => (
            <li key={t.n} className={`log-${t.by} log-${t.result.kind}`}>
              <span className="log-n">{t.n}.</span> {turnText(t)}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
