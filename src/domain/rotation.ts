import { POSITIONS, POSITION_ZONES, QUARTERS_PER_GAME, type Position } from './netball';
import type { QuarterLineup } from './lineup';

/** Order in which the first seven players are given a home position. */
export const HOME_POSITION_ORDER: Position[] = ['GS', 'GA', 'WA', 'C', 'GK', 'GD', 'WD'];

// When only some home players need a rest, rest them in this order so the
// breaks are spread across attack, centre and defence.
const REST_ORDER: Position[] = ['GS', 'C', 'GK', 'GA', 'WD', 'WA', 'GD'];

/**
 * Each player's main position in an existing rotation: the one they play most.
 * When two players claim a position, the one who plays it more keeps it.
 */
export function homePositions(
  quarters: QuarterLineup[],
  playerIds: string[],
): Map<string, Position> {
  const counts: { id: string; position: Position; count: number }[] = [];
  for (const id of playerIds) {
    for (const position of POSITIONS) {
      const count = quarters.filter((lineup) => lineup[position] === id).length;
      if (count) counts.push({ id, position, count });
    }
  }
  counts.sort((a, b) => b.count - a.count || playerIds.indexOf(a.id) - playerIds.indexOf(b.id));

  const homes = new Map<string, Position>();
  const taken = new Set<Position>();
  for (const { id, position } of counts) {
    if (homes.has(id) || taken.has(position)) continue;
    homes.set(id, position);
    taken.add(position);
  }
  return homes;
}

/**
 * Builds a four-quarter rotation for the players in `playerIds` (in priority order).
 *
 * - Seven players get a home position: their entry in `keepHomes` if it has
 *   one, otherwise the next open position in HOME_POSITION_ORDER, in list order.
 * - Any further players are substitutes and start without a position.
 * - Court time is shared as evenly as quarters allow (everyone plays within
 *   one quarter of everyone else), with home players keeping any extra quarter.
 * - Home players only ever play their home position; substitutes fill the
 *   positions of whoever is resting, staying in the same position where possible.
 */
export function generateRotation(
  playerIds: string[],
  keepHomes: Map<string, Position> = new Map(),
  quarters: number = QUARTERS_PER_GAME,
): QuarterLineup[] {
  const homeOf = new Map<string, Position>();
  const taken = new Set<Position>();
  for (const id of playerIds) {
    const position = keepHomes.get(id);
    if (position && !taken.has(position)) {
      homeOf.set(id, position);
      taken.add(position);
    }
  }
  const open = HOME_POSITION_ORDER.filter((position) => !taken.has(position));
  for (const id of playerIds) {
    if (homeOf.has(id)) continue;
    const position = open.shift();
    if (!position) break;
    homeOf.set(id, position);
  }

  const courtSize = POSITIONS.length;
  const home = playerIds.filter((id) => homeOf.has(id));
  const subs = playerIds.filter((id) => !homeOf.has(id));

  // Quarters each player sits out. Total sits = quarters × subs, so exactly
  // `subs.length` players rest every quarter.
  const totalSlots = quarters * Math.min(playerIds.length, courtSize);
  const base = Math.floor(totalSlots / Math.max(playerIds.length, 1));
  let extra = totalSlots - base * playerIds.length;

  // Players who get the extra quarter: home players first (fewest changes),
  // least-rested positions first, then substitutes.
  const restOrderedHome = [...home].sort(
    (a, b) => REST_ORDER.indexOf(homeOf.get(a)!) - REST_ORDER.indexOf(homeOf.get(b)!),
  );
  const extraPriority = [...[...restOrderedHome].reverse(), ...subs];
  const sits = new Map<string, number>();
  for (const id of extraPriority) {
    const played = base + (extra > 0 ? 1 : 0);
    if (extra > 0) extra--;
    sits.set(id, quarters - played);
  }

  // Choose each player's rest quarters, most-rested players first. Every
  // quarter has room for the same number of resting players; rests are never
  // back to back when that can be avoided (a player resting twice plays in between).
  const resting: Set<string>[] = Array.from({ length: quarters }, () => new Set());
  const totalSits = [...sits.values()].reduce((a, b) => a + b, 0);
  const room = Array.from({ length: quarters }, () => totalSits / quarters);
  const byMostRest = [...subs].sort((a, b) => sits.get(b)! - sits.get(a)!);
  for (const id of [...byMostRest, ...restOrderedHome].sort(
    (a, b) => sits.get(b)! - sits.get(a)!,
  )) {
    const chosen = pickRestQuarters(sits.get(id)!, room);
    for (const quarter of chosen) {
      resting[quarter]!.add(id);
      room[quarter]!--;
    }
  }

  const lastPosition = new Map<string, Position>();
  return resting.map((restingNow) => {
    const lineup: QuarterLineup = {};
    const vacant: Position[] = [];
    for (const id of home) {
      const position = homeOf.get(id)!;
      if (restingNow.has(id)) vacant.push(position);
      else lineup[position] = id;
    }

    let onSubs = subs.filter((id) => !restingNow.has(id));
    const place = (id: string, position: Position) => {
      lineup[position] = id;
      lastPosition.set(id, position);
      vacant.splice(vacant.indexOf(position), 1);
      onSubs = onSubs.filter((s) => s !== id);
    };

    // Keep subs in the position they last played, then in the same zone, then anywhere.
    for (const id of [...onSubs]) {
      const last = lastPosition.get(id);
      if (last && vacant.includes(last)) place(id, last);
    }
    for (const id of [...onSubs]) {
      const last = lastPosition.get(id);
      const sameZone = last && vacant.find((p) => POSITION_ZONES[p] === POSITION_ZONES[last]);
      if (sameZone) place(id, sameZone);
    }
    for (const id of [...onSubs]) {
      const position = vacant[0];
      if (position) place(id, position);
    }

    return lineup;
  });
}

/**
 * Picks `count` quarters for a player to rest, from those with room left.
 * Prefers no back-to-back rests, then the quarters with the most room.
 */
function pickRestQuarters(count: number, room: number[]): number[] {
  let best: number[] = [];
  let bestScore = -Infinity;
  for (const combo of combinations(room.length, count)) {
    if (combo.some((q) => room[q]! <= 0)) continue;
    const backToBack = combo.filter((q, i) => i > 0 && q === combo[i - 1]! + 1).length;
    const space = combo.reduce((sum, q) => sum + room[q]!, 0);
    const score = -backToBack * 1000 + space;
    if (score > bestScore) {
      best = combo;
      bestScore = score;
    }
  }
  return best;
}

/** All ascending selections of `count` indices from 0..n-1. */
function combinations(n: number, count: number): number[][] {
  if (count === 0) return [[]];
  const result: number[][] = [];
  const walk = (start: number, picked: number[]) => {
    if (picked.length === count) {
      result.push(picked);
      return;
    }
    for (let i = start; i < n; i++) walk(i + 1, [...picked, i]);
  };
  walk(0, []);
  return result;
}
