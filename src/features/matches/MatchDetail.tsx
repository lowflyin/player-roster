import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  db,
  deleteMatch,
  setMatchPlayerSelected,
  setMatchPosition,
  type Player,
} from '../../db/db';
import { POSITION_NAMES, POSITION_ZONES, POSITIONS } from '../../domain/netball';
import { positionOf, quartersPlayed, unfilledPositions } from '../../domain/lineup';
import { formatMatchDate } from './format';
import { PositionPicker } from './PositionPicker';

interface Props {
  matchId: string;
  onBack: () => void;
}

interface Selection {
  playerId: string;
  quarter: number;
}

export function MatchDetail({ matchId, onBack }: Props) {
  const match = useLiveQuery(() => db.matches.get(matchId), [matchId]);
  const players = useLiveQuery(() => db.players.orderBy('name').toArray(), []);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [editingSquad, setEditingSquad] = useState(false);

  if (!match || !players) return null;

  const squad = players.filter((p) => match.playerIds.includes(p.id));
  const playerName = (id: string) => players.find((p) => p.id === id)?.name ?? 'Unknown';

  async function handleDelete() {
    if (!window.confirm('Delete this match? This cannot be undone.')) return;
    await deleteMatch(matchId);
    onBack();
  }

  const selectedPlayer: Player | undefined = selection
    ? players.find((p) => p.id === selection.playerId)
    : undefined;

  return (
    <section>
      <button className="secondary back" onClick={onBack}>
        ‹ Matches
      </button>

      <div className="section-header">
        <div>
          <h2>{match.opponent ? `vs ${match.opponent}` : 'Match'}</h2>
          <p className="hint">
            {formatMatchDate(match.date)} · {match.quarterMinutes} min quarters
          </p>
        </div>
      </div>

      <ZoneLegend />

      {squad.length === 0 ? (
        <p className="empty">No players in this match yet. Use “Edit squad” below to add some.</p>
      ) : (
        <div className="matrix-scroll">
          <table className="matrix">
            <thead>
              <tr>
                <th scope="col" className="matrix-player">
                  Player
                </th>
                {match.quarters.map((_, quarter) => (
                  <th scope="col" key={quarter}>
                    Q{quarter + 1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {squad.map((player) => (
                <tr key={player.id}>
                  <th scope="row" className="matrix-player">
                    <span className="matrix-name">{player.name}</span>
                    <span className="matrix-played">
                      {quartersPlayed(match.quarters, player.id)}/{match.quarters.length} on court
                    </span>
                  </th>
                  {match.quarters.map((lineup, quarter) => {
                    const position = positionOf(lineup, player.id);
                    return (
                      <td key={quarter}>
                        <button
                          className={`cell ${position ? `zone-${POSITION_ZONES[position]}` : 'bench'}`}
                          aria-label={`${player.name}, quarter ${quarter + 1}: ${
                            position ? POSITION_NAMES[position] : 'Bench'
                          }`}
                          onClick={() => setSelection({ playerId: player.id, quarter })}
                        >
                          {position ?? '–'}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row" className="matrix-player">
                  On court
                </th>
                {match.quarters.map((lineup, quarter) => {
                  const missing = unfilledPositions(lineup);
                  return (
                    <td
                      key={quarter}
                      className={missing.length === 0 ? 'court-full' : 'court-gaps'}
                      title={missing.length ? `Unfilled: ${missing.join(', ')}` : 'All filled'}
                    >
                      {POSITIONS.length - missing.length}/{POSITIONS.length}
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <div className="match-actions">
        <button className="secondary" onClick={() => setEditingSquad((v) => !v)}>
          {editingSquad ? 'Done' : 'Edit squad'}
        </button>
        <button className="secondary danger" onClick={handleDelete}>
          Delete match
        </button>
      </div>

      {editingSquad && (
        <fieldset className="field squad-picker">
          <legend>Squad</legend>
          {players.length === 0 && <p className="hint">Add players on the Roster tab first.</p>}
          {players.map((player) => (
            <label key={player.id} className="check-row">
              <input
                type="checkbox"
                checked={match.playerIds.includes(player.id)}
                onChange={(e) => setMatchPlayerSelected(matchId, player.id, e.target.checked)}
              />
              <span>{player.name}</span>
            </label>
          ))}
        </fieldset>
      )}

      {selection && selectedPlayer && (
        <PositionPicker
          player={selectedPlayer}
          quarter={selection.quarter}
          lineup={match.quarters[selection.quarter] ?? {}}
          nameOf={playerName}
          onSelect={async (position) => {
            await setMatchPosition(matchId, selection.quarter, selection.playerId, position);
            setSelection(null);
          }}
          onClose={() => setSelection(null)}
        />
      )}
    </section>
  );
}

function ZoneLegend() {
  return (
    <ul className="zone-legend" aria-label="Position colours">
      <li className="zone-attack">Attack</li>
      <li className="zone-centre">Centre</li>
      <li className="zone-defence">Defence</li>
    </ul>
  );
}
