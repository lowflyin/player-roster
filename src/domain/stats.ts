import { POSITIONS, type Position } from './netball';
import { positionOf, type QuarterLineup } from './lineup';

/** A game as far as season totals need to know. */
export interface PlayedGame {
  playerIds: string[];
  quarters: QuarterLineup[];
}

export interface SeasonTally {
  /** Quarters played in each position. */
  positions: Record<Position, number>;
  /** Quarters in the squad but off court. */
  bench: number;
  /** Quarters on court in any position. */
  onCourt: number;
  /** Games the player was picked for. */
  games: number;
}

function emptyTally(): SeasonTally {
  const positions = Object.fromEntries(POSITIONS.map((p) => [p, 0])) as Record<Position, number>;
  return { positions, bench: 0, onCourt: 0, games: 0 };
}

/** Adds up every player's quarters in each position across the given games. */
export function seasonTallies(games: PlayedGame[]): Map<string, SeasonTally> {
  const tallies = new Map<string, SeasonTally>();
  const tallyFor = (id: string) => {
    let tally = tallies.get(id);
    if (!tally) tallies.set(id, (tally = emptyTally()));
    return tally;
  };

  for (const game of games) {
    for (const id of game.playerIds) {
      const tally = tallyFor(id);
      tally.games += 1;
      for (const lineup of game.quarters) {
        const position = positionOf(lineup, id);
        if (position) {
          tally.positions[position] += 1;
          tally.onCourt += 1;
        } else {
          tally.bench += 1;
        }
      }
    }
  }
  return tallies;
}
