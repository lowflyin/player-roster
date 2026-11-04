import { useState, type FormEvent } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { addPlayer, db, removePlayer } from '../../db/db';

export function TeamPage() {
  const players = useLiveQuery(() => db.players.orderBy('name').toArray(), []);
  const [name, setName] = useState('');

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    // Clear first so anything typed while saving is not wiped.
    setName('');
    await addPlayer(name);
  }

  return (
    <section>
      <h2>Team</h2>

      <form className="add-player" onSubmit={handleSubmit}>
        <label htmlFor="player-name" className="visually-hidden">
          Player name
        </label>
        <input
          id="player-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Player name"
          autoComplete="off"
        />
        <button type="submit">Add</button>
      </form>

      {players === undefined ? null : players.length === 0 ? (
        <p className="empty">No players yet. Add your squad above.</p>
      ) : (
        <ul className="player-list">
          {players.map((player) => (
            <li key={player.id}>
              <span>{player.name}</span>
              <button
                className="secondary"
                aria-label={`Remove ${player.name}`}
                onClick={() => removePlayer(player.id)}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
