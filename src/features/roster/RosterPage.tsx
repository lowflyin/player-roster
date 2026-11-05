import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, getSettings, saveSettings, type Match } from '../../db/db';
import { formatMatchDate, todayIsoDate } from '../matches/format';
import { MatchForm } from '../matches/MatchForm';
import { MatchRoster } from '../matches/MatchRoster';

export function RosterPage() {
  const matches = useLiveQuery(() => db.matches.orderBy('date').toArray(), []);
  const settings = useLiveQuery(() => getSettings(), []);
  const [creating, setCreating] = useState(false);

  if (creating) {
    return (
      <MatchForm
        onCancel={() => setCreating(false)}
        onCreated={async (id) => {
          await saveSettings({ currentMatchId: id });
          setCreating(false);
        }}
      />
    );
  }

  if (!matches || !settings) return null;

  const current = matches.find((m) => m.id === settings.currentMatchId) ?? defaultMatch(matches);

  return (
    <section>
      <div className="section-header actions-only">
        <h2 className="visually-hidden">Roster</h2>
        <button onClick={() => setCreating(true)}>New game</button>
      </div>

      {!current ? (
        <p className="empty">
          No games yet. Create one and positions are allocated for all four quarters.
        </p>
      ) : (
        <>
          {matches.length > 1 && (
            <div className="field">
              <label htmlFor="roster-match" className="visually-hidden">
                Game
              </label>
              <select
                id="roster-match"
                value={current.id}
                onChange={(e) => saveSettings({ currentMatchId: e.target.value })}
              >
                {matches.map((match) => (
                  <option key={match.id} value={match.id}>
                    {formatMatchDate(match.date)}
                    {match.opponent ? ` · vs ${match.opponent}` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
          {/* Keyed so an open edit form or picker resets when switching match. */}
          <MatchRoster key={current.id} matchId={current.id} />
        </>
      )}
    </section>
  );
}

/** The next match from today, or the most recent one if they're all in the past. */
function defaultMatch(matchesByDate: Match[]): Match | undefined {
  const today = todayIsoDate();
  return matchesByDate.find((m) => m.date >= today) ?? matchesByDate.at(-1);
}
