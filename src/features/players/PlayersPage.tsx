import type { CSSProperties } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { POSITIONS, POSITION_NAMES, POSITION_ZONES, type Zone } from '../../domain/netball';
import { seasonTallies } from '../../domain/stats';
import { todayIsoDate } from '../matches/format';

const ZONES: Zone[] = ['attack', 'centre', 'defence'];

/**
 * Season totals: how many quarters each player has played in each position,
 * counting every game dated today or earlier (games still to come are left out).
 */
export function PlayersPage() {
  const data = useLiveQuery(async () => {
    const [players, games] = await Promise.all([
      db.players.orderBy('name').toArray(),
      db.matches.where('date').belowOrEqual(todayIsoDate()).toArray(),
    ]);
    return { players, games };
  }, []);

  if (!data) return null;
  const { players, games } = data;
  const tallies = seasonTallies(games);
  // Shade each cell against the most quarters anyone has played in one position.
  const most = Math.max(
    1,
    ...[...tallies.values()].flatMap((tally) => POSITIONS.map((p) => tally.positions[p])),
  );

  return (
    <section>
      <h2>Players</h2>
      {players.length === 0 ? (
        <p className="empty">No players yet. Add your squad on the Team tab.</p>
      ) : (
        <>
          <p className="stats-summary">
            Quarters played in each position over {games.length}{' '}
            {games.length === 1 ? 'game' : 'games'} so far. Empty boxes are positions not played
            yet.
          </p>
          <div className="heat-key" aria-hidden="true">
            <span className="heat-zero">0</span>
            <span>Fewer</span>
            <span className="heat-ramps">
              {ZONES.map((zone) => (
                <span key={zone} className={`heat-ramp zone-${zone}`} />
              ))}
            </span>
            <span>More quarters</span>
          </div>
          <div className="stats-scroll">
            <table className="stats">
              <thead>
                <tr>
                  <th scope="col" className="stats-player">
                    Player
                  </th>
                  {POSITIONS.map((position) => (
                    <th key={position} scope="col" className={`zone-${POSITION_ZONES[position]}`}>
                      <abbr title={POSITION_NAMES[position]}>{position}</abbr>
                    </th>
                  ))}
                  <th scope="col">
                    <abbr title="Quarters on the bench">Off</abbr>
                  </th>
                </tr>
              </thead>
              <tbody>
                {players.map((player) => {
                  const tally = tallies.get(player.id);
                  return (
                    <tr key={player.id}>
                      <th scope="row" className="stats-player">
                        <span className="stats-name">{player.name}</span>
                        <span className="stats-games">
                          {tally?.games ?? 0} {tally?.games === 1 ? 'game' : 'games'}
                        </span>
                      </th>
                      {POSITIONS.map((position) => {
                        const count = tally?.positions[position] ?? 0;
                        // 1 quarter is a light tint; the most anyone has played is full colour.
                        const heat = Math.round(20 + (80 * count) / most);
                        // Shade bands the stylesheet uses to pick a readable text colour.
                        const shade = heat >= 95 ? ' strong full' : heat >= 75 ? ' strong' : '';
                        return (
                          <td
                            key={position}
                            className={
                              count ? `zone-${POSITION_ZONES[position]} heat${shade}` : 'none'
                            }
                            style={
                              count ? ({ '--heat-level': `${heat}%` } as CSSProperties) : undefined
                            }
                            aria-label={`${player.name}, ${POSITION_NAMES[position]}: ${count}`}
                          >
                            {count}
                          </td>
                        );
                      })}
                      <td
                        className="off"
                        aria-label={`${player.name}, off court: ${tally?.bench ?? 0}`}
                      >
                        {tally?.bench ?? 0}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
