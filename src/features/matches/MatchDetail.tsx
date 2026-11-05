import { MatchRoster } from './MatchRoster';

interface Props {
  matchId: string;
  onBack: () => void;
}

export function MatchDetail({ matchId, onBack }: Props) {
  return (
    <section>
      <button className="secondary back no-print" onClick={onBack}>
        ‹ Games
      </button>

      <MatchRoster matchId={matchId} onDeleted={onBack} />
    </section>
  );
}
