import { POSITIONS, totalGameMinutes } from './netball';

describe('netball domain', () => {
  it('has the seven court positions', () => {
    expect(POSITIONS).toHaveLength(7);
  });

  it('calculates total game time from quarter length', () => {
    expect(totalGameMinutes(10)).toBe(40);
    expect(totalGameMinutes(12)).toBe(48);
  });
});
