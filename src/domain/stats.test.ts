import { seasonTallies } from './stats';

describe('seasonTallies', () => {
  it('counts quarters in each position, on the bench and games picked, across games', () => {
    const tallies = seasonTallies([
      {
        playerIds: ['a', 'b'],
        quarters: [{ GS: 'a', GA: 'b' }, { GS: 'a', GA: 'b' }, { GA: 'a' }, { C: 'b' }],
      },
      { playerIds: ['a'], quarters: [{ GS: 'a' }, {}, {}, { GK: 'a' }] },
    ]);

    const a = tallies.get('a')!;
    expect(a.positions).toMatchObject({ GS: 3, GA: 1, GK: 1, C: 0 });
    expect(a.onCourt).toBe(5);
    expect(a.bench).toBe(3);
    expect(a.games).toBe(2);

    const b = tallies.get('b')!;
    expect(b.positions).toMatchObject({ GA: 2, C: 1 });
    expect(b.bench).toBe(1);
    expect(b.games).toBe(1);
  });

  it('leaves out players who were never picked', () => {
    expect(seasonTallies([]).size).toBe(0);
  });
});
