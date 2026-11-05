import Dexie, { type EntityTable } from 'dexie';
import { DEFAULT_QUARTER_MINUTES, type Position } from '../domain/netball';
import { assignPosition, type QuarterLineup } from '../domain/lineup';
import { generateRotation, homePositions } from '../domain/rotation';
import { planFromHistory, type PastGame } from '../domain/history';

export interface Player {
  id: string;
  name: string;
  preferredPositions: Position[];
  createdAt: number;
}

export interface TeamSettings {
  id: 'team';
  teamName: string;
  /** The match shown on the Roster tab. */
  currentMatchId?: string;
  quarterMinutes: number;
}

export interface Match {
  id: string;
  opponent: string;
  /** Court number or name, e.g. "3". */
  court?: string;
  /** Local calendar date, YYYY-MM-DD. */
  date: string;
  quarterMinutes: number;
  /** Players selected for this match. */
  playerIds: string[];
  /** One lineup per quarter. */
  quarters: QuarterLineup[];
  /** Layouts replaced by Re-allocate, most recent first, so pressing again moves players on. */
  previousLayouts?: QuarterLineup[][];
  createdAt: number;
}

export const DEFAULT_SETTINGS: TeamSettings = {
  id: 'team',
  teamName: '',
  quarterMinutes: DEFAULT_QUARTER_MINUTES,
};

// All data lives in the browser's IndexedDB; there is no backend.
// When changing the schema, add a new db.version(n) block rather than editing old ones.
export const db = new Dexie('player-roster') as Dexie & {
  players: EntityTable<Player, 'id'>;
  settings: EntityTable<TeamSettings, 'id'>;
  matches: EntityTable<Match, 'id'>;
};

db.version(1).stores({
  players: 'id, name, createdAt',
  settings: 'id',
});

db.version(2).stores({
  players: 'id, name, createdAt',
  settings: 'id',
  matches: 'id, date, createdAt',
});

export async function addPlayer(name: string): Promise<Player> {
  const player: Player = {
    id: crypto.randomUUID(),
    name: name.trim(),
    preferredPositions: [],
    createdAt: Date.now(),
  };
  await db.players.add(player);
  return player;
}

/** Deletes a player and takes them out of today's and future matches; past matches are kept as played. */
export async function removePlayer(id: string): Promise<void> {
  const today = new Date().toLocaleDateString('en-CA');
  await db.transaction('rw', db.players, db.matches, async () => {
    await db.players.delete(id);
    const upcoming = await db.matches.where('date').aboveOrEqual(today).toArray();
    for (const match of upcoming) {
      if (!match.playerIds.includes(id)) continue;
      const playerIds = match.playerIds.filter((p) => p !== id);
      await db.matches.update(match.id, { playerIds, quarters: await rotate(match, playerIds) });
    }
  });
}

export async function getSettings(): Promise<TeamSettings> {
  return (await db.settings.get('team')) ?? DEFAULT_SETTINGS;
}

export async function saveSettings(changes: Partial<Omit<TeamSettings, 'id'>>): Promise<void> {
  const current = await getSettings();
  await db.settings.put({ ...current, ...changes });
}

/**
 * A fresh fair rotation for a match's new squad, keeping each player's current
 * main position. Who gets more or less court time follows the weekly rules.
 */
async function rotate(match: Match, playerIds: string[]): Promise<QuarterLineup[]> {
  const plan = await planWeek(playerIds, match.date, match.createdAt);
  return generateRotation(playerIds, homePositions(match.quarters, playerIds), plan.extraFirst);
}

/**
 * Plans positions for a game from the games played before it, so players move
 * to positions they haven't played lately and substitute duty rotates from
 * week to week. A game counts as earlier if it's on an earlier date, or on
 * the same date and was created first.
 */
async function planWeek(
  playerIds: string[],
  date: string,
  createdAt: number,
  replacedLayouts: PastGame[] = [],
) {
  const earlier = (await db.matches.where('date').belowOrEqual(date).toArray()).filter(
    (m) => m.date < date || m.createdAt < createdAt,
  );
  earlier.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
  return planFromHistory(playerIds, earlier, replacedLayouts);
}

/** Creates a match with positions allocated, planned from the weeks before it. */
export async function createMatch(
  details: Pick<Match, 'opponent' | 'court' | 'date' | 'quarterMinutes' | 'playerIds'>,
): Promise<Match> {
  const createdAt = Date.now();
  const plan = await planWeek(details.playerIds, details.date, createdAt);

  const match: Match = {
    id: crypto.randomUUID(),
    ...details,
    opponent: details.opponent.trim(),
    court: details.court?.trim(),
    playerIds: plan.order,
    quarters: generateRotation(plan.order, plan.homes, plan.extraFirst),
    createdAt,
  };
  await db.matches.add(match);
  return match;
}

export async function updateMatch(
  matchId: string,
  changes: Partial<Pick<Match, 'opponent' | 'court'>>,
): Promise<void> {
  await db.matches.update(matchId, changes);
}

export async function deleteMatch(id: string): Promise<void> {
  await db.matches.delete(id);
}

export async function setMatchPosition(
  matchId: string,
  quarter: number,
  playerId: string,
  position: Position | null,
): Promise<void> {
  await db.transaction('rw', db.matches, async () => {
    const match = await db.matches.get(matchId);
    if (!match) return;
    const quarters = match.quarters.map((lineup, index) =>
      index === quarter ? assignPosition(lineup, playerId, position) : lineup,
    );
    await db.matches.update(matchId, { quarters });
  });
}

// How many replaced layouts a match remembers for Re-allocate.
const MAX_LAYOUTS = 6;

/**
 * Gives a match new positions: players move off their current position (and
 * current substitutes come on), avoiding positions from earlier weeks too.
 * Replaces manual changes; pressing again moves everyone on again rather
 * than back to an earlier layout.
 */
export async function reallocateMatch(matchId: string): Promise<void> {
  await db.transaction('rw', db.matches, async () => {
    const match = await db.matches.get(matchId);
    if (!match) return;
    const layouts = [match.quarters, ...(match.previousLayouts ?? [])].slice(0, MAX_LAYOUTS);
    const replaced = layouts.map((quarters) => ({ playerIds: match.playerIds, quarters }));
    const plan = await planWeek(match.playerIds, match.date, match.createdAt, replaced);
    await db.matches.update(matchId, {
      playerIds: plan.order,
      quarters: generateRotation(plan.order, plan.homes, plan.extraFirst),
      previousLayouts: layouts,
    });
  });
}

/**
 * Adds or removes a player from the match squad and rebuilds the rotation so
 * court time stays fair. Added players join as substitutes.
 */
export async function setMatchPlayerSelected(
  matchId: string,
  playerId: string,
  selected: boolean,
): Promise<void> {
  await db.transaction('rw', db.matches, async () => {
    const match = await db.matches.get(matchId);
    if (!match) return;
    if (selected === match.playerIds.includes(playerId)) return;
    const playerIds = selected
      ? [...match.playerIds, playerId]
      : match.playerIds.filter((id) => id !== playerId);
    await db.matches.update(matchId, { playerIds, quarters: await rotate(match, playerIds) });
  });
}
