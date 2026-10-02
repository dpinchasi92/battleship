import { useState } from 'react';
import { TUTORIAL } from '../app/tutorial.ts';
import type { TutorialContext } from '../app/tutorial.ts';

type Props = {
  inline?: boolean;
  index: number;
  ctx: TutorialContext;
  hintReason: string | null;
  hintReady: boolean;
  onNext: () => void;
  onSkip: () => void;
  onHint: () => void;
};

export function Coach({ inline = false, index, ctx, hintReason, hintReady, onNext, onSkip, onHint }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const step = TUTORIAL[index];
  if (!step) return null;
  const progress = `${index + 1}/${TUTORIAL.length}`;
  const hintButton = step.showHint && (
    <button
      type="button"
      className={`btn ${collapsed ? 'btn-small' : ''}`}
      onClick={onHint}
      disabled={!hintReady}
      title={hintReady ? 'Show the best square to fire at' : 'Wait for your turn'}
      data-testid="coach-hint"
    >
      Hint
    </button>
  );
  const closeButton = (
    <button
      type="button"
      className="coach-icon"
      onClick={onSkip}
      aria-label="Close tutorial"
      title="Close tutorial"
      data-testid="coach-close"
    >
      ×
    </button>
  );

  if (collapsed) {
    return (
      <aside
        className={`parchment coach coach-collapsed ${inline ? 'coach-inline' : ''}`}
        aria-live="polite"
        data-testid="coach"
      >
        <button
          type="button"
          className="coach-chip"
          onClick={() => setCollapsed(false)}
          aria-expanded={false}
          aria-label={`Show Quartermaster, step ${progress}: ${step.title}`}
          title="Show Quartermaster"
          data-testid="coach-expand"
        >
          <span className="coach-avatar coach-avatar-small" aria-hidden>
            ⚓
          </span>
          <span className="coach-chip-text" key={index}>
            <span className="eyebrow">Quartermaster · {progress}</span>
            <span className="coach-chip-title">{step.title}</span>
          </span>
          <span className="coach-chip-caret" aria-hidden>
            ▴
          </span>
        </button>
        {hintButton}
        {closeButton}
      </aside>
    );
  }

  return (
    <aside className={`parchment coach ${inline ? 'coach-inline' : ''}`} aria-live="polite" data-testid="coach">
      <div className="coach-avatar" aria-hidden>
        ⚓
      </div>
      <div className="coach-body">
        <div className="coach-head">
          <p className="eyebrow">Quartermaster · {progress}</p>
          <div className="coach-icons">
            <button
              type="button"
              className="coach-icon"
              onClick={() => setCollapsed(true)}
              aria-expanded
              aria-label="Minimize Quartermaster"
              title="Minimize"
              data-testid="coach-minimize"
            >
              –
            </button>
            {closeButton}
          </div>
        </div>
        <h3 className="coach-title">{step.title}</h3>
        <p>{step.text(ctx)}</p>
        {hintReason && <p className="coach-hint">Hint: {hintReason}</p>}
        <div className="btn-row">
          {step.advance === 'next' && (
            <button type="button" className="btn btn-primary" onClick={onNext} data-testid="coach-next">
              {index === TUTORIAL.length - 1 ? 'Got it' : 'Next'}
            </button>
          )}
          {hintButton}
          <button type="button" className="btn btn-link" onClick={onSkip}>
            Skip tutorial
          </button>
        </div>
      </div>
    </aside>
  );
}
