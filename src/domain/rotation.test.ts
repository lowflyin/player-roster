import { POSITIONS } from './netball';
import { positionOf, quartersPlayed } from './lineup';
import { HOME_POSITION_ORDER, generateRotation, homePositions } from './rotation';

const squad = (n: number) => Array.from({ length: n }, (_, i) => `p${i + 1}`);

describe('generateRotation', () => {
  it('gives seven players one position for the whole game', () => {
    const rotation = generateRotation(squad(7));
    expect(rotation).toHaveLength(4);
    for (const lineup of rotation) {
      expect(lineup).toEqual({
        GS: 'p1',
        GA: 'p2',
        WA: 'p3',
        C: 'p4',
        GK: 'p5',
        GD: 'p6',
        WD: 'p7',
      });
    }
  });

  it('leaves positions open when short of players', () => {
    const rotation = generateRotation(squad(5));
    expect(rotation[0]).toEqual({ GS: 'p1', GA: 'p2', WA: 'p3', C: 'p4', GK: 'p5' });
  });

  it.each([8, 9, 10, 11, 12])('shares court time fairly with %i players', (n) => {
    const players = squad(n);
    const rotation = generateRotation(players);

    for (const lineup of rotation) {
      // Every position filled, nobody twice.
      expect(Object.keys(lineup).sort()).toEqual([...POSITIONS].sort());
      expect(new Set(Object.values(lineup)).size).toBe(POSITIONS.length);
    }

    const played = players.map((id) => quartersPlayed(rotation, id));
    expect(played.reduce((a, b) => a + b, 0)).toBe(4 * 7);
    expect(Math.max(...played) - Math.min(...played)).toBeLessThanOrEqual(1);

    // Home players only ever play their own position.
    players.slice(0, 7).forEach((id, i) => {
      for (const lineup of rotation) {
        const position = positionOf(lineup, id);
        if (position) expect(position).toBe(HOME_POSITION_ORDER[i]);
      }
    });
  });

  it('subs in for resting players with 8 players', () => {
    const rotation = generateRotation(squad(8));
    // Four players play every quarter, four play three.
    const played = squad(8).map((id) => quartersPlayed(rotation, id));
    expect(played.filter((q) => q === 4)).toHaveLength(4);
    expect(played.filter((q) => q === 3)).toHaveLength(4);
    // The substitute starts on the bench and covers a different position each later quarter.
    expect(positionOf(rotation[0]!, 'p8')).toBeUndefined();
    expect(rotation.slice(1).map((lineup) => positionOf(lineup, 'p8'))).toEqual(['GS', 'C', 'GK']);
  });

  it('gives two substitutes two quarters each with 10 players', () => {
    const rotation = generateRotation(squad(10));
    // Two subs play 2 quarters; everyone else plays 3.
    const played = squad(10).map((id) => quartersPlayed(rotation, id));
    expect(played.filter((q) => q === 2)).toHaveLength(2);
    expect(played.filter((q) => q === 3)).toHaveLength(8);
  });
});

describe('homePositions', () => {
  it('keeps home positions when a player is removed', () => {
    const players = squad(9);
    const homes = homePositions(generateRotation(players), players);
    expect(homes.get('p3')).toBe('WA');

    // p2 (GA) drops out: everyone else keeps their position, a sub becomes GA.
    const remaining = players.filter((id) => id !== 'p2');
    const rotation = generateRotation(
      remaining,
      homePositions(generateRotation(players), remaining),
    );
    for (const id of ['p1', 'p3', 'p4', 'p5', 'p6', 'p7']) {
      expect(homePositions(rotation, remaining).get(id)).toBe(homes.get(id));
    }
    expect(rotation.every((lineup) => lineup.GA)).toBe(true);
  });
});

describe('court time by squad size', () => {
  const split = (n: number) => {
    const rotation = generateRotation(squad(n));
    const played = squad(n).map((id) => quartersPlayed(rotation, id));
    return { rotation, count: (q: number) => played.filter((p) => p === q).length };
  };

  it('7 players: everyone plays the full game', () => {
    expect(split(7).count(4)).toBe(7);
  });

  it('8 players: four play 3/4, four play the full game', () => {
    const { count } = split(8);
    expect([count(3), count(4)]).toEqual([4, 4]);
  });

  it('9 players: one plays the full game, eight play 3/4', () => {
    const { count } = split(9);
    expect([count(4), count(3)]).toEqual([1, 8]);
  });

  it('10 players: two play 2/4, eight play 3/4', () => {
    const { count } = split(10);
    expect([count(2), count(3)]).toEqual([2, 8]);
  });

  it.each([10, 11, 12])('%i players: nobody rests two quarters in a row', (n) => {
    const { rotation } = split(n);
    for (const id of squad(n)) {
      const off = rotation.map((lineup) => !positionOf(lineup, id));
      const backToBack = off.some((isOff, q) => q > 0 && isOff && off[q - 1]);
      expect({ id, backToBack }).toEqual({ id, backToBack: false });
    }
  });
});
