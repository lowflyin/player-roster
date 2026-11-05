import { POSITIONS } from './netball';

describe('netball domain', () => {
  it('has the seven court positions', () => {
    expect(POSITIONS).toHaveLength(7);
  });
});
