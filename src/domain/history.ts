import { POSITIONS, QUARTERS_PER_GAME, type Position } from './netball';
import type { QuarterLineup } from './lineup';
import { HOME_POSITION_ORDER, REST_ORDER, homePositions } from './rotation';

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
  /** Who gets any extra quarter of court time, first to last, for generateRotation. */
  extraFirst: string[];
}

/**
 * Quarters a player must spend in a position in one game for it to count as
 * having played that position. A single quarter covering as a substitute doesn't.
 */
export const QUARTERS_TO_COUNT = 2;

// Cost of giving a player a position they've already played: a fixed amount
// for every earlier game they played it in, plus more the more recent that
// game was. So players get a position they've never played if they can,
// otherwise the one they played longest ago.
const REPEAT_COST = 100;
const RECENT_COST = 50;

/** Positions the player counts as having played in a game. */
export function positionsPlayed(game: PastGame, id: string): Position[] {
  return POSITIONS.filter(
    (position) => game.quarters.filter((l) => l[position] === id).length >= QUARTERS_TO_COUNT,
  );
}

/**
 * Plans home positions for a new game from the games before it (most recent
 * first), so players move to a position they haven't played before (or, once
 * they've played them all, the one longest ago) and substitute duty goes to
 * those who have been a substitute least.
 *
 * `replacedLayouts` are this game's own earlier layouts (most recent first)
 * when re-allocating. Players also move off those positions and the current
 * substitutes come on, but replaced layouts don't count as court time or
 * substitute turns, since they were never played.
 *
 * With no history this gives the same result as listing players in order:
 * the first seven get HOME_POSITION_ORDER, the rest are substitutes.
 */
export function planFromHistory(
  playerIds: string[],
  pastGames: PastGame[],
  replacedLayouts: PastGame[] = [],
): WeeklyPlan {
  const index = new Map(playerIds.map((id, i) => [id, i]));

  const isSub = (game: PastGame | undefined, id: string) =>
    !!game && game.playerIds.includes(id) && !homePositions(game.quarters, game.playerIds).has(id);
  const onCourt = (game: PastGame, id: string) =>
    game.quarters.filter((l) => POSITIONS.some((p) => l[p] === id)).length;
  const totalCourt = (id: string) => pastGames.reduce((sum, g) => sum + onCourt(g, id), 0);
  const timesSub = (id: string) => pastGames.filter((g) => isSub(g, id)).length;

  // Court time last game decides who must get more or less this game:
  // 0 = played half a game or less, so must get more (3/4 or a full game);
  // 2 = played the full game, so must not get a full game while there are substitutes;
  // 1 = no rule either way.
  const hasSubs = playerIds.length > POSITIONS.length;
  const courtTier = (id: string) => {
    const last = pastGames.find((g) => g.playerIds.includes(id));
    if (!last) return 1;
    const played = onCourt(last, id);
    if (played <= QUARTERS_PER_GAME / 2) return 0;
    if (hasSubs && played === QUARTERS_PER_GAME) return 2;
    return 1;
  };

  // Substitutes: when re-allocating, not the current substitutes; then whoever
  // has been a substitute least; then preferably someone due less court time;
  // then whoever has had the most court time overall. With nothing to go on,
  // the last players in the list.
  const subNow = (id: string) => (isSub(replacedLayouts[0], id) ? 1 : 0);
  const subCount = Math.max(playerIds.length - POSITIONS.length, 0);
  const subs = [...playerIds]
    .sort(
      (a, b) =>
        subNow(a) - subNow(b) ||
        timesSub(a) - timesSub(b) ||
        courtTier(b) - courtTier(a) ||
        totalCourt(b) - totalCourt(a) ||
        index.get(b)! - index.get(a)!,
    )
    .slice(0, subCount);
  const home = playerIds.filter((id) => !subs.includes(id));

  const repeatCost = new Map<string, number>();
  [...replacedLayouts, ...pastGames].forEach((game, gamesAgo) => {
    for (const id of home) {
      for (const position of positionsPlayed(game, id)) {
        const key = id + position;
        const cost = REPEAT_COST + RECENT_COST / (gamesAgo + 1);
        repeatCost.set(key, (repeatCost.get(key) ?? 0) + cost);
      }
    }
  });
  const homes = cheapestAssignment(home, (id, position) => repeatCost.get(id + position) ?? 0);

  // Who gets the extra quarter: players who must get more first, players who
  // must get less last; then whoever has had the least court time overall;
  // then home players (fewest changes), least-rested positions first.
  const rank = (id: string) => {
    const homePosition = homes.get(id);
    return homePosition
      ? REST_ORDER.length - REST_ORDER.indexOf(homePosition)
      : 100 + index.get(id)!;
  };
  const extraFirst = [...playerIds].sort(
    (a, b) => courtTier(a) - courtTier(b) || totalCourt(a) - totalCourt(b) || rank(a) - rank(b),
  );

  // Substitutes who have had the least court time overall get any extra quarter.
  const orderedSubs = [...subs].sort(
    (a, b) => totalCourt(a) - totalCourt(b) || index.get(a)! - index.get(b)!,
  );
  return { order: [...home, ...orderedSubs], homes, extraFirst };
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
