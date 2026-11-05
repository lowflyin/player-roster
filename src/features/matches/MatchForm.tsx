import { useState, type FormEvent } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { createMatch, db } from '../../db/db';
import { todayIsoDate } from './format';

interface Props {
  onCancel: () => void;
  onCreated: (matchId: string) => void;
  /** Heading above the form. */
  title?: string;
  /** Label for the button that leaves without creating a game. */
  cancelLabel?: string;
}

export function MatchForm({
  onCancel,
  onCreated,
  title = 'New game',
  cancelLabel = 'Cancel',
}: Props) {
  const players = useLiveQuery(() => db.players.orderBy('name').toArray(), []);

  const [opponent, setOpponent] = useState('');
  const [court, setCourt] = useState('');
  const [date, setDate] = useState(todayIsoDate);
  // Players the coach has left out; everyone else is in the squad.
  const [excluded, setExcluded] = useState<Set<string>>(() => new Set());

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
    if (!players) return;
    const match = await createMatch({
      opponent,
      court,
      date,
      playerIds: players.filter((p) => !excluded.has(p.id)).map((p) => p.id),
    });
    onCreated(match.id);
  }

  return (
    <section>
      <h2>{title}</h2>

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

        <fieldset className="field squad-picker">
          <legend>Squad</legend>
          {players?.length === 0 && (
            <p className="hint">
              Add players on the Team tab first, or add them to the game later.
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
            {cancelLabel}
          </button>
          <button type="submit">Create game</button>
        </div>
      </form>
    </section>
  );
}
