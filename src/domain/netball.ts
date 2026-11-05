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

export const DEFAULT_QUARTER_MINUTES = 10;

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
