import { TUTORIAL } from '../app/tutorial.ts';
import type { TutorialContext } from '../app/tutorial.ts';

type Props = {
  inline?: boolean;
  index: number;
  ctx: TutorialContext;
  hintReason: string | null;
  onNext: () => void;
  onSkip: () => void;
  onHint: (() => void) | null;
};

export function Coach({ inline = false, index, ctx, hintReason, onNext, onSkip, onHint }: Props) {
  const step = TUTORIAL[index];
  if (!step) return null;
  return (
    <aside className={`parchment coach ${inline ? 'coach-inline' : ''}`} aria-live="polite" data-testid="coach">
      <div className="coach-avatar" aria-hidden>
        ⚓
      </div>
      <div className="coach-body">
        <p className="eyebrow">
          Quartermaster · {index + 1}/{TUTORIAL.length}
        </p>
        <h3 className="coach-title">{step.title}</h3>
        <p>{step.text(ctx)}</p>
        {hintReason && <p className="coach-hint">Hint: {hintReason}</p>}
        <div className="btn-row">
          {step.advance === 'next' && (
            <button type="button" className="btn btn-primary" onClick={onNext} data-testid="coach-next">
              {index === TUTORIAL.length - 1 ? 'Got it' : 'Next'}
            </button>
          )}
          {step.showHint && onHint && (
            <button type="button" className="btn" onClick={onHint}>
              Hint
            </button>
          )}
          <button type="button" className="btn btn-link" onClick={onSkip}>
            Skip tutorial
          </button>
        </div>
      </div>
    </aside>
  );
}
