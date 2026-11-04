import { POSITIONS, type Position } from './netball';

/** Who is playing each position in one quarter. Unlisted positions are unfilled. */
export type QuarterLineup = Partial<Record<Position, string>>;

export function positionOf(lineup: QuarterLineup, playerId: string): Position | undefined {
  return POSITIONS.find((position) => lineup[position] === playerId);
}

/**
 * Puts a player in a position (or on the bench when `position` is null).
 * If someone else already holds that position they swap: they take the
 * player's old position, or go to the bench if the player was benched.
 */
export function assignPosition(
  lineup: QuarterLineup,
  playerId: string,
  position: Position | null,
): QuarterLineup {
  const next: QuarterLineup = { ...lineup };
  const previous = positionOf(lineup, playerId);
  if (previous) delete next[previous];

  if (position) {
    const displaced = lineup[position];
    next[position] = playerId;
    if (displaced && displaced !== playerId && previous) next[previous] = displaced;
  }

  return next;
}

export function removePlayerFromLineup(lineup: QuarterLineup, playerId: string): QuarterLineup {
  return assignPosition(lineup, playerId, null);
}

export function unfilledPositions(lineup: QuarterLineup): Position[] {
  return POSITIONS.filter((position) => !lineup[position]);
}

/** Number of quarters in which the player is on court. */
export function quartersPlayed(quarters: QuarterLineup[], playerId: string): number {
  return quarters.filter((lineup) => positionOf(lineup, playerId)).length;
}
