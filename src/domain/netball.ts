export const POSITIONS = ['GS', 'GA', 'WA', 'C', 'WD', 'GD', 'GK'] as const;

export type Position = (typeof POSITIONS)[number];

export const POSITION_NAMES: Record<Position, string> = {
  GS: 'Goal Shooter',
  GA: 'Goal Attack',
  WA: 'Wing Attack',
  C: 'Centre',
  WD: 'Wing Defence',
  GD: 'Goal Defence',
  GK: 'Goal Keeper',
};

export const QUARTERS_PER_GAME = 4;

/** Common junior competition quarter lengths, in minutes. */
export const QUARTER_LENGTH_OPTIONS = [8, 10, 12, 15] as const;

export const DEFAULT_QUARTER_MINUTES = 10;

export function totalGameMinutes(quarterMinutes: number): number {
  return quarterMinutes * QUARTERS_PER_GAME;
}

export type Zone = 'attack' | 'centre' | 'defence';

export const POSITION_ZONES: Record<Position, Zone> = {
  GS: 'attack',
  GA: 'attack',
  WA: 'attack',
  C: 'centre',
  WD: 'defence',
  GD: 'defence',
  GK: 'defence',
};
