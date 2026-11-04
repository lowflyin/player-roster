import { deleteMatch } from '../../db/db';
import { MatchRoster } from './MatchRoster';

interface Props {
  matchId: string;
  onBack: () => void;
}

export function MatchDetail({ matchId, onBack }: Props) {
  async function handleDelete() {
    if (!window.confirm('Delete this match? This cannot be undone.')) return;
    await deleteMatch(matchId);
    onBack();
  }

  return (
    <section>
      <button className="secondary back" onClick={onBack}>
        ‹ Matches
      </button>

      <MatchRoster matchId={matchId} />

      <div className="match-actions">
        <button className="secondary danger" onClick={handleDelete}>
          Delete match
        </button>
      </div>
    </section>
  );
}
