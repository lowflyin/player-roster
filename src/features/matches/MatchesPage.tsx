import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { formatMatchDate } from './format';
import { MatchForm } from './MatchForm';
import { MatchDetail } from './MatchDetail';

type View = { kind: 'list' } | { kind: 'new' } | { kind: 'match'; id: string };

export function MatchesPage() {
  const [view, setView] = useState<View>({ kind: 'list' });
  const matches = useLiveQuery(() => db.matches.orderBy('date').reverse().toArray(), []);

  const showList = () => setView({ kind: 'list' });

  if (view.kind === 'new') {
    return <MatchForm onCancel={showList} onCreated={(id) => setView({ kind: 'match', id })} />;
  }

  if (view.kind === 'match') {
    return <MatchDetail matchId={view.id} onBack={showList} />;
  }

  return (
    <section>
      <div className="section-header">
        <h2>Games</h2>
        <button onClick={() => setView({ kind: 'new' })}>New Game</button>
      </div>

      {matches === undefined ? null : matches.length === 0 ? (
        <p className="empty">No games yet. Create one to plan positions for each quarter.</p>
      ) : (
        <ul className="match-list">
          {matches.map((match) => (
            <li key={match.id}>
              <button onClick={() => setView({ kind: 'match', id: match.id })}>
                <span className="match-title">
                  {match.opponent ? `vs ${match.opponent}` : 'Game'}
                </span>
                <span className="match-meta">
                  {formatMatchDate(match.date)} · {match.playerIds.length} players
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
