import { useState, type FormEvent } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  db,
  deleteMatch,
  reallocateMatch,
  setMatchPlayerSelected,
  setMatchPosition,
  updateMatch,
  type Match,
} from '../../db/db';
import { POSITION_NAMES, POSITION_ZONES, POSITIONS } from '../../domain/netball';
import { positionOf, quartersPlayed, unfilledPositions } from '../../domain/lineup';
import { formatMatchDate } from './format';
import { PositionPicker } from './PositionPicker';
import { ConfirmSheet } from '../../components/ConfirmSheet';

interface Selection {
  playerId: string;
  quarter: number;
}

/** Match bar, player × quarter position grid and who's playing, for one match. */
interface Props {
  matchId: string;
  /** Called after the coach deletes the match. */
  onDeleted?: () => void;
}

export function MatchRoster({ matchId, onDeleted }: Props) {
  const match = useLiveQuery(() => db.matches.get(matchId), [matchId]);
  const players = useLiveQuery(() => db.players.orderBy('name').toArray(), []);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [confirmingReallocate, setConfirmingReallocate] = useState(false);

  if (!match || !players) return null;

  const byId = new Map(players.map((p) => [p.id, p]));
  const nameOf = (id: string) => byId.get(id)?.name ?? 'Unknown';
  // Same order as the Team tab (players are loaded by name), so each player
  // keeps their row from match to match as positions rotate.
  const squad = players.filter((p) => match.playerIds.includes(p.id));
  const selectedPlayer = selection ? byId.get(selection.playerId) : undefined;

  async function handleReallocate() {
    setConfirmingReallocate(false);
    await reallocateMatch(matchId);
  }

  return (
    <>
      <MatchBar match={match} onDeleted={onDeleted} />

      <ZoneLegend />

      {squad.length === 0 ? (
        <p className="empty">Nobody is playing yet. Tick players under “Playing” below.</p>
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
                            position ? POSITION_NAMES[position] : 'Substitute'
                          }`}
                          onClick={() => setSelection({ playerId: player.id, quarter })}
                        >
                          {position ?? ''}
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

      <p className="hint">Tap a square to change a position. Blank squares are substitutes.</p>

      <div className="match-actions">
        <button
          className="secondary"
          onClick={() => setConfirmingReallocate(true)}
          disabled={squad.length === 0}
        >
          Re-allocate positions
        </button>
      </div>

      <fieldset className="field squad-picker">
        <legend>Playing</legend>
        {players.length === 0 && <p className="hint">Add players on the Team tab first.</p>}
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
        <p className="hint">Unticking a player takes them out and shares their court time.</p>
      </fieldset>

      {confirmingReallocate && (
        <ConfirmSheet
          title="Re-allocate positions?"
          message="Players swap to new positions, avoiding positions from this game and earlier weeks. Any changes you have made to this game are replaced."
          confirmLabel="Re-allocate"
          onConfirm={handleReallocate}
          onCancel={() => setConfirmingReallocate(false)}
        />
      )}

      {selection && selectedPlayer && (
        <PositionPicker
          player={selectedPlayer}
          quarter={selection.quarter}
          lineup={match.quarters[selection.quarter] ?? {}}
          nameOf={nameOf}
          onSelect={async (position) => {
            await setMatchPosition(matchId, selection.quarter, selection.playerId, position);
            setSelection(null);
          }}
          onClose={() => setSelection(null)}
        />
      )}
    </>
  );
}

function MatchBar({ match, onDeleted }: { match: Match; onDeleted?: () => void }) {
  const [editing, setEditing] = useState(false);
  const [court, setCourt] = useState('');
  const [opponent, setOpponent] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  function startEditing() {
    setCourt(match.court ?? '');
    setOpponent(match.opponent);
    setEditing(true);
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    await updateMatch(match.id, { court: court.trim(), opponent: opponent.trim() });
    setEditing(false);
  }

  async function handleDelete() {
    setConfirmingDelete(false);
    await deleteMatch(match.id);
    onDeleted?.();
  }

  if (editing) {
    return (
      <form className="match-bar editing" onSubmit={handleSave}>
        <div className="match-bar-fields">
          <div className="field">
            <label htmlFor="bar-court">Court</label>
            <input
              id="bar-court"
              value={court}
              onChange={(e) => setCourt(e.target.value)}
              inputMode="numeric"
              autoComplete="off"
            />
          </div>
          <div className="field">
            <label htmlFor="bar-opponent">Opponent</label>
            <input
              id="bar-opponent"
              value={opponent}
              onChange={(e) => setOpponent(e.target.value)}
              autoComplete="off"
            />
          </div>
        </div>
        <div className="form-actions">
          <button type="button" className="secondary" onClick={() => setEditing(false)}>
            Cancel
          </button>
          <button type="submit">Save</button>
        </div>
        <button
          type="button"
          className="secondary danger delete-match"
          onClick={() => setConfirmingDelete(true)}
        >
          Delete game
        </button>
        {confirmingDelete && (
          <ConfirmSheet
            title="Delete this game?"
            message="The game and its positions are removed. This cannot be undone."
            confirmLabel="Delete"
            danger
            onConfirm={handleDelete}
            onCancel={() => setConfirmingDelete(false)}
          />
        )}
      </form>
    );
  }

  return (
    <div className="match-bar" role="region" aria-label="Game">
      <div className="match-bar-court">
        <span className="match-bar-label">Court</span>
        <span className="match-bar-value">{match.court || '–'}</span>
      </div>
      <div className="match-bar-opponent">
        <span className="match-bar-label">vs</span>
        <span className="match-bar-value">{match.opponent || 'Opponent not set'}</span>
        <span className="match-bar-date">{formatMatchDate(match.date)}</span>
      </div>
      <button className="secondary" onClick={startEditing} aria-label="Edit court and opponent">
        Edit
      </button>
    </div>
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
