import { quartersPlayed } from './lineup';
import { planFromHistory, type PastGame } from './history';
import { HOME_POSITION_ORDER, generateRotation, homePositions } from './rotation';

const squad = (n: number) => Array.from({ length: n }, (_, i) => `p${i + 1}`);

/** Plays `weeks` games in a row, each planned from the ones before. Most recent first. */
function season(playerIds: string[], weeks: number): PastGame[] {
  const games: PastGame[] = [];
  for (let week = 0; week < weeks; week++) {
    const plan = planFromHistory(playerIds, games);
    games.unshift({ playerIds: plan.order, quarters: generateRotation(plan.order, plan.homes) });
  }
  return games;
}

const homeOf = (game: PastGame, id: string) => homePositions(game.quarters, game.playerIds).get(id);

describe('planFromHistory', () => {
  it('matches the default allocation with no history', () => {
    const plan = planFromHistory(squad(9), []);
    expect(plan.order).toEqual(squad(9));
    squad(7).forEach((id, i) => expect(plan.homes.get(id)).toBe(HOME_POSITION_ORDER[i]));
  });

  it('gives each of 7 players every position over 7 weeks', () => {
    const games = season(squad(7), 7);
    for (const id of squad(7)) {
      const positions = games.map((game) => homeOf(game, id));
      expect(new Set(positions).size).toBe(7);
    }
  });

  it.each([7, 8, 9, 10])('never repeats last week’s position (%i players)', (n) => {
    const games = season(squad(n), 6);
    for (let week = 0; week < games.length - 1; week++) {
      const [thisWeek, lastWeek] = [games[week]!, games[week + 1]!];
      for (const id of squad(n)) {
        const now = homeOf(thisWeek, id);
        if (now)
          expect({ id, week, position: now }).not.toEqual({
            id,
            week,
            position: homeOf(lastWeek, id),
          });
      }
    }
  });

  it('rotates substitute duty so nobody is a substitute twice before everyone has been', () => {
    const games = season(squad(9), 4); // 2 subs a week: 8 sub turns over 4 weeks for 9 players
    const subTurns = squad(9).map(
      (id) => games.filter((game) => homeOf(game, id) === undefined).length,
    );
    expect(Math.max(...subTurns)).toBe(1);
  });

  it('shares the short 2/4 games around with 10 players', () => {
    const games = season(squad(10), 5); // 2 short games a week: 10 over 5 weeks
    const shortGames = squad(10).map(
      (id) => games.filter((game) => quartersPlayed(game.quarters, id) === 2).length,
    );
    expect(shortGames).toEqual(Array(10).fill(1));
  });
});
