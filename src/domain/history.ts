import { POSITIONS, type Position } from './netball';
import type { QuarterLineup } from './lineup';
import { HOME_POSITION_ORDER, homePositions } from './rotation';

/** A previously played game, as far as rotation planning needs to know. */
export interface PastGame {
  playerIds: string[];
  quarters: QuarterLineup[];
}

export interface WeeklyPlan {
  /** Players in priority order for generateRotation: home players, then substitutes. */
  order: string[];
  /** Home position for each player who has one. */
  homes: Map<string, Position>;
}

// How strongly to avoid repeating a position: per quarter played there last
// game, and per quarter played there in any earlier game.
const LAST_GAME_WEIGHT = 30;
const ANY_GAME_WEIGHT = 3;

/**
 * Plans home positions for a new game from the games before it (most recent
 * first), so players move to a position they haven't played lately and
 * substitute duty goes to those who have been a substitute least.
 *
 * With no history this gives the same result as listing players in order:
 * the first seven get HOME_POSITION_ORDER, the rest are substitutes.
 */
export function planFromHistory(playerIds: string[], pastGames: PastGame[]): WeeklyPlan {
  const index = new Map(playerIds.map((id, i) => [id, i]));
  const lastGame = pastGames[0];

  const atPosition = (games: PastGame[], id: string, position: Position) =>
    games.reduce((sum, g) => sum + g.quarters.filter((l) => l[position] === id).length, 0);
  const onCourt = (game: PastGame, id: string) =>
    game.quarters.filter((l) => POSITIONS.some((p) => l[p] === id)).length;
  const totalCourt = (id: string) => pastGames.reduce((sum, g) => sum + onCourt(g, id), 0);
  const timesSub = (id: string) =>
    pastGames.filter(
      (g) => g.playerIds.includes(id) && !homePositions(g.quarters, g.playerIds).has(id),
    ).length;

  // Substitutes: whoever has been a substitute least, then has had the most
  // court time overall. With nothing to go on, the last players in the list.
  const subCount = Math.max(playerIds.length - POSITIONS.length, 0);
  const subs = [...playerIds]
    .sort(
      (a, b) =>
        timesSub(a) - timesSub(b) || totalCourt(b) - totalCourt(a) || index.get(b)! - index.get(a)!,
    )
    .slice(0, subCount);
  const home = playerIds.filter((id) => !subs.includes(id));

  const cost = (id: string, position: Position) =>
    LAST_GAME_WEIGHT * (lastGame ? atPosition([lastGame], id, position) : 0) +
    ANY_GAME_WEIGHT * atPosition(pastGames, id, position);
  const homes = cheapestAssignment(home, cost);

  // Substitutes who have had the least court time overall get any extra quarter.
  const orderedSubs = [...subs].sort(
    (a, b) => totalCourt(a) - totalCourt(b) || index.get(a)! - index.get(b)!,
  );
  return { order: [...home, ...orderedSubs], homes };
}

/**
 * Gives each player a different position, minimising total cost. Ties go to
 * the earliest arrangement in list order × HOME_POSITION_ORDER, so with equal
 * costs player i gets HOME_POSITION_ORDER[i].
 */
function cheapestAssignment(
  players: string[],
  cost: (id: string, position: Position) => number,
): Map<string, Position> {
  let best: Position[] = [];
  let bestCost = Infinity;
  const used = new Set<Position>();
  const picked: Position[] = [];

  const search = (i: number, total: number) => {
    if (total >= bestCost) return;
    if (i === players.length) {
      best = [...picked];
      bestCost = total;
      return;
    }
    for (const position of HOME_POSITION_ORDER) {
      if (used.has(position)) continue;
      used.add(position);
      picked.push(position);
      search(i + 1, total + cost(players[i]!, position));
      picked.pop();
      used.delete(position);
    }
  };
  search(0, 0);

  return new Map(players.map((id, i) => [id, best[i]!]));
}
