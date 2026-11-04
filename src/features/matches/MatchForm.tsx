import { useState, type FormEvent } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { createMatch, db, getSettings } from '../../db/db';
import { QUARTER_LENGTH_OPTIONS } from '../../domain/netball';
import { todayIsoDate } from './format';

interface Props {
  onCancel: () => void;
  onCreated: (matchId: string) => void;
}

export function MatchForm({ onCancel, onCreated }: Props) {
  const players = useLiveQuery(() => db.players.orderBy('name').toArray(), []);
  const settings = useLiveQuery(() => getSettings(), []);

  const [opponent, setOpponent] = useState('');
  const [court, setCourt] = useState('');
  const [date, setDate] = useState(todayIsoDate);
  const [quarterMinutes, setQuarterMinutes] = useState<number | null>(null);
  // Players the coach has left out; everyone else is in the squad.
  const [excluded, setExcluded] = useState<Set<string>>(() => new Set());

  const minutes = quarterMinutes ?? settings?.quarterMinutes;

  function toggle(playerId: string) {
    setExcluded((current) => {
      const next = new Set(current);
      if (next.has(playerId)) next.delete(playerId);
      else next.add(playerId);
      return next;
    });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!players || minutes === undefined) return;
    const match = await createMatch({
      opponent,
      court,
      date,
      quarterMinutes: minutes,
      playerIds: players.filter((p) => !excluded.has(p.id)).map((p) => p.id),
    });
    onCreated(match.id);
  }

  return (
    <section>
      <h2>New match</h2>

      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="match-opponent">Opponent</label>
          <input
            id="match-opponent"
            value={opponent}
            onChange={(e) => setOpponent(e.target.value)}
            placeholder="e.g. Northside Comets"
            autoComplete="off"
          />
        </div>

        <div className="field">
          <label htmlFor="match-court">Court</label>
          <input
            id="match-court"
            value={court}
            onChange={(e) => setCourt(e.target.value)}
            placeholder="e.g. 3"
            inputMode="numeric"
            autoComplete="off"
          />
        </div>

        <div className="field">
          <label htmlFor="match-date">Date</label>
          <input
            id="match-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>

        {minutes !== undefined && (
          <div className="field">
            <label htmlFor="match-quarter-minutes">Quarter length</label>
            <select
              id="match-quarter-minutes"
              value={minutes}
              onChange={(e) => setQuarterMinutes(Number(e.target.value))}
            >
              {QUARTER_LENGTH_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option} minutes
                </option>
              ))}
            </select>
          </div>
        )}

        <fieldset className="field squad-picker">
          <legend>Squad</legend>
          {players?.length === 0 && (
            <p className="hint">
              Add players on the Team tab first, or add them to the match later.
            </p>
          )}
          {players?.map((player) => (
            <label key={player.id} className="check-row">
              <input
                type="checkbox"
                checked={!excluded.has(player.id)}
                onChange={() => toggle(player.id)}
              />
              <span>{player.name}</span>
            </label>
          ))}
        </fieldset>

        <div className="form-actions">
          <button type="button" className="secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit">Create match</button>
        </div>
      </form>
    </section>
  );
}
