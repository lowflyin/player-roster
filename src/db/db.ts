import Dexie, { type EntityTable } from 'dexie';
import { DEFAULT_QUARTER_MINUTES, type Position } from '../domain/netball';

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
};

db.version(1).stores({
  players: 'id, name, createdAt',
  settings: 'id',
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
