import Dexie, { type EntityTable } from 'dexie';
import { DEFAULT_QUARTER_MINUTES, QUARTERS_PER_GAME, type Position } from '../domain/netball';
import { assignPosition, removePlayerFromLineup, type QuarterLineup } from '../domain/lineup';

export interface Player {
  id: string;
  name: string;
  preferredPositions: Position[];
  createdAt: number;
}

export interface TeamSettings {
  id: 'team';
  teamName: string;
  quarterMinutes: number;
}

export interface Match {
  id: string;
  opponent: string;
  /** Local calendar date, YYYY-MM-DD. */
  date: string;
  quarterMinutes: number;
  /** Players selected for this match. */
  playerIds: string[];
  /** One lineup per quarter. */
  quarters: QuarterLineup[];
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

export async function removePlayer(id: string): Promise<void> {
  await db.players.delete(id);
}

export async function getSettings(): Promise<TeamSettings> {
  return (await db.settings.get('team')) ?? DEFAULT_SETTINGS;
}

export async function saveSettings(changes: Partial<Omit<TeamSettings, 'id'>>): Promise<void> {
  const current = await getSettings();
  await db.settings.put({ ...current, ...changes });
}

export async function createMatch(
  details: Pick<Match, 'opponent' | 'date' | 'quarterMinutes' | 'playerIds'>,
): Promise<Match> {
  const match: Match = {
    id: crypto.randomUUID(),
    ...details,
    opponent: details.opponent.trim(),
    quarters: Array.from({ length: QUARTERS_PER_GAME }, () => ({})),
    createdAt: Date.now(),
  };
  await db.matches.add(match);
  return match;
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

/** Adds or removes a player from the match squad; removed players leave the court. */
export async function setMatchPlayerSelected(
  matchId: string,
  playerId: string,
  selected: boolean,
): Promise<void> {
  await db.transaction('rw', db.matches, async () => {
    const match = await db.matches.get(matchId);
    if (!match) return;
    if (selected) {
      if (match.playerIds.includes(playerId)) return;
      await db.matches.update(matchId, { playerIds: [...match.playerIds, playerId] });
    } else {
      await db.matches.update(matchId, {
        playerIds: match.playerIds.filter((id) => id !== playerId),
        quarters: match.quarters.map((lineup) => removePlayerFromLineup(lineup, playerId)),
      });
    }
  });
}
