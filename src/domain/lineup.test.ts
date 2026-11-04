import {
  assignPosition,
  positionOf,
  quartersPlayed,
  removePlayerFromLineup,
  unfilledPositions,
} from './lineup';

describe('lineup', () => {
  it('assigns a benched player to an empty position', () => {
    expect(assignPosition({}, 'ruby', 'GS')).toEqual({ GS: 'ruby' });
  });

  it('moves a player to a new position', () => {
    expect(assignPosition({ GS: 'ruby' }, 'ruby', 'C')).toEqual({ C: 'ruby' });
  });

  it('swaps with the player already in the position', () => {
    expect(assignPosition({ GS: 'ruby', C: 'mia' }, 'ruby', 'C')).toEqual({
      GS: 'mia',
      C: 'ruby',
    });
  });

  it('benches the displaced player when coming on from the bench', () => {
    expect(assignPosition({ C: 'mia' }, 'ruby', 'C')).toEqual({ C: 'ruby' });
  });

  it('benches a player', () => {
    expect(assignPosition({ GK: 'ruby', C: 'mia' }, 'ruby', null)).toEqual({ C: 'mia' });
    expect(removePlayerFromLineup({ GK: 'ruby' }, 'ruby')).toEqual({});
  });

  it('finds positions and gaps', () => {
    const lineup = { GS: 'ruby', GK: 'mia' };
    expect(positionOf(lineup, 'mia')).toBe('GK');
    expect(positionOf(lineup, 'zoe')).toBeUndefined();
    expect(unfilledPositions(lineup)).toEqual(['GA', 'WA', 'C', 'WD', 'GD']);
  });

  it('counts quarters played', () => {
    expect(quartersPlayed([{ GS: 'ruby' }, {}, { C: 'ruby' }, { C: 'mia' }], 'ruby')).toBe(2);
  });
});
