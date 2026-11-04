import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';

export function RosterPage() {
  const players = useLiveQuery(() => db.players.orderBy('name').toArray(), []);

  return (
    <section>
      <h2>Roster</h2>

      {players === undefined ? null : players.length === 0 ? (
        <p className="empty">No players yet. Add your squad on the Team tab.</p>
      ) : (
        <ul className="player-list" aria-label="Players">
          {players.map((player) => (
            <li key={player.id}>{player.name}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
