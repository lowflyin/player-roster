import { quartersPlayed } from './lineup';
import { planFromHistory, positionsPlayed, type PastGame } from './history';
import { HOME_POSITION_ORDER, generateRotation, homePositions } from './rotation';

const squad = (n: number) => Array.from({ length: n }, (_, i) => `p${i + 1}`);

/** Plays `weeks` games in a row, each planned from the ones before. Most recent first. */
function season(playerIds: string[], weeks: number): PastGame[] {
  const games: PastGame[] = [];
  for (let week = 0; week < weeks; week++) {
    const plan = planFromHistory(playerIds, games);
    games.unshift({
      playerIds: plan.order,
      quarters: generateRotation(plan.order, plan.homes, plan.extraFirst),
    });
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

  it('does not count a single quarter in a position as having played it', () => {
    const game: PastGame = {
      playerIds: ['p1'],
      quarters: [{ GS: 'p1' }, { C: 'p1' }, { C: 'p1' }, {}],
    };
    expect(positionsPlayed(game, 'p1')).toEqual(['C']);
  });

  it.each([7, 8, 9, 10])(
    'gives every player a position they have not played before (%i players, 3 weeks)',
    (n) => {
      const games = season(squad(n), 3).reverse(); // oldest first
      games.forEach((game, week) => {
        for (const id of squad(n)) {
          const home = homeOf(game, id);
          if (!home) continue;
          const before = games.slice(0, week).flatMap((g) => positionsPlayed(g, id));
          expect({ id, week, home, repeat: before.includes(home) }).toEqual({
            id,
            week,
            home,
            repeat: false,
          });
        }
      });
    },
  );

  describe('court time from week to week', () => {
    const played = (game: PastGame, id: string) => quartersPlayed(game.quarters, id);

    it.each([8, 9, 10])('%i players: 2/4 last game means 3/4 or more this game', (n) => {
      const games = season(squad(n), 8).reverse(); // oldest first
      for (let week = 1; week < games.length; week++) {
        for (const id of squad(n)) {
          if (played(games[week - 1]!, id) <= 2) {
            expect({ week, id, played: played(games[week]!, id) >= 3 }).toEqual({
              week,
              id,
              played: true,
            });
          }
        }
      }
    });

    it.each([8, 9, 10])('%i players: a full game last game means no full game this game', (n) => {
      const games = season(squad(n), 8).reverse();
      for (let week = 1; week < games.length; week++) {
        for (const id of squad(n)) {
          if (played(games[week - 1]!, id) === 4) {
            expect({ week, id, full: played(games[week]!, id) === 4 }).toEqual({
              week,
              id,
              full: false,
            });
          }
        }
      }
    });

    it('8 players: the full-game and 3/4 groups swap each week', () => {
      const [week2, week1] = season(squad(8), 2);
      for (const id of squad(8)) {
        expect(played(week1!, id) + played(week2!, id)).toBe(7);
      }
    });

    it('keeps the within-game splits', () => {
      for (const game of season(squad(9), 6)) {
        const counts = squad(9).map((id) => played(game, id));
        expect(counts.filter((c) => c === 4)).toHaveLength(1);
        expect(counts.filter((c) => c === 3)).toHaveLength(8);
      }
    });
  });
});
