import { TIMES, WEATHERS } from '../app/atmosphere.ts';
import { LEVELS, type Settings } from '../app/settings.ts';
import type { Level } from '../engine/index.ts';
import { Toggle } from './Toggle.tsx';

type Props = {
  settings: Settings;
  onChange: (s: Settings) => void;
  onStart: () => void;
  record: Record<Level, { wins: number; losses: number }>;
};

const title = (s: string) => s[0]!.toUpperCase() + s.slice(1);

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly (readonly [T, string])[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="option">
      <span>{label}</span>
      <div className="segmented" role="radiogroup" aria-label={label}>
        {options.map(([v, text]) => (
          <button key={v} type="button" role="radio" aria-checked={value === v} className={value === v ? 'on' : ''} onClick={() => onChange(v)}>
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Menu({ settings, onChange, onStart, record }: Props) {
  return (
    <div className="menu-wrap">
      <div className="parchment menu">
        <p className="eyebrow">A naval duel against the machine</p>
        <h1 className="title">Broadsides</h1>
        <p className="subtitle">Hide your fleet. Hunt theirs. Outwit an AI that calculates every square.</p>

        <fieldset className="levels">
          <legend className="panel-heading">Choose your opponent</legend>
          {LEVELS.map((l) => {
            const r = record[l.level];
            return (
              <label key={l.level} className={`level-card ${settings.level === l.level ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="level"
                  value={l.level}
                  checked={settings.level === l.level}
                  onChange={() => onChange({ ...settings, level: l.level })}
                />
                <span className="level-title">
                  {l.title}
                  {l.difficulty && <span className="level-difficulty">({l.difficulty})</span>}
                  {l.level === 'cadet' && <span className="badge">Tutorial</span>}
                </span>
                <span className="level-blurb">{l.blurb}</span>
                {r.wins + r.losses > 0 && (
                  <span className="level-record">
                    {r.wins}W · {r.losses}L
                  </span>
                )}
              </label>
            );
          })}
        </fieldset>

        <div className="menu-options">
          <Segmented
            label="First broadside"
            value={settings.first}
            options={[
              ['player', 'You'],
              ['ai', 'Enemy'],
              ['coin', 'Coin toss'],
            ]}
            onChange={(first) => onChange({ ...settings, first })}
          />
          <Segmented
            label="Time of day"
            value={settings.time}
            options={[['random', 'Random'], ...TIMES.map((t) => [t, title(t)] as const)]}
            onChange={(time) => onChange({ ...settings, time })}
          />
          <Segmented
            label="Weather"
            value={settings.weather}
            options={[['random', 'Random'], ...WEATHERS.map((w) => [w, title(w)] as const)]}
            onChange={(weather) => onChange({ ...settings, weather })}
          />
          <Toggle
            label="3D battle view"
            checked={settings.view === '3d'}
            onChange={(on) => onChange({ ...settings, view: on ? '3d' : '2d' })}
          />
          <Toggle label="Sound" checked={settings.sound} onChange={(sound) => onChange({ ...settings, sound })} />
          <Toggle label="Music" checked={settings.music} onChange={(music) => onChange({ ...settings, music })} />
        </div>

        <button type="button" className="btn btn-primary btn-big" onClick={onStart} data-testid="set-sail">
          Set Sail
        </button>
      </div>
    </div>
  );
}
