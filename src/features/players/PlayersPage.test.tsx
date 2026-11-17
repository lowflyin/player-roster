import { render, screen } from '@testing-library/react';
import { addPlayer, db, type Match } from '../../db/db';
import type { QuarterLineup } from '../../domain/lineup';
import { PlayersPage } from './PlayersPage';

function game(id: string, date: string, playerIds: string[], quarters: QuarterLineup[]): Match {
  return { id, date, playerIds, quarters, opponent: '', quarterMinutes: 10, createdAt: 0 };
}

describe('PlayersPage', () => {
  it('adds up quarters per position over the season, leaving out games to come', async () => {
    const { id: ruby } = await addPlayer('Ruby');
    const { id: mia } = await addPlayer('Mia');
    const { id: zoe } = await addPlayer('Zoe');
    const squad = [ruby, mia, zoe];

    await db.matches.bulkAdd([
      // Round 1: everyone plays every quarter.
      game('r1', '2000-01-01', squad, [
        { GS: ruby, GA: mia, C: zoe },
        { GS: ruby, GA: mia, C: zoe },
        { GA: ruby, GS: mia, C: zoe },
        { GA: ruby, GS: mia, C: zoe },
      ]),
      // Round 2: Mia is off for 2 quarters (Q2 and Q3).
      game('r2', '2000-01-08', squad, [
        { C: ruby, WD: mia, GK: zoe },
        { C: ruby, GK: zoe },
        { C: ruby, GK: zoe },
        { WA: ruby, WD: mia, GD: zoe },
      ]),
      // Round 3: Zoe isn't picked; Ruby has a quarter off.
      game(
        'r3',
        '2000-01-15',
        [ruby, mia],
        [{ GK: ruby, GD: mia }, { GK: ruby, GD: mia }, { GD: mia }, { GK: ruby, GD: mia }],
      ),
      // Next week's game hasn't been played, so it doesn't count.
      game('next', '2999-01-01', squad, [
        { GS: zoe, GA: ruby, C: mia },
        { GS: zoe, GA: ruby, C: mia },
        { GS: zoe, GA: ruby, C: mia },
        { GS: zoe, GA: ruby, C: mia },
      ]),
    ]);

    render(<PlayersPage />);

    expect(await screen.findByText(/over 3 games so far/)).toBeInTheDocument();

    const cell = (name: string, position: string, count: number) =>
      expect(screen.getByLabelText(`${name}, ${position}: ${count}`)).toBeInTheDocument();

    cell('Ruby', 'Goal Shooter', 2);
    cell('Ruby', 'Goal Attack', 2);
    cell('Ruby', 'Centre', 3);
    cell('Ruby', 'Wing Attack', 1);
    cell('Ruby', 'Goal Keeper', 3);
    cell('Ruby', 'off court', 1);

    cell('Mia', 'Goal Shooter', 2);
    cell('Mia', 'Goal Attack', 2);
    cell('Mia', 'Wing Defence', 2);
    cell('Mia', 'Goal Defence', 4);
    cell('Mia', 'Centre', 0); // only next week's game has her at C
    cell('Mia', 'off court', 2);

    cell('Zoe', 'Centre', 4);
    cell('Zoe', 'Goal Keeper', 3);
    cell('Zoe', 'Goal Defence', 1);
    cell('Zoe', 'Goal Shooter', 0);
    cell('Zoe', 'off court', 0);

    expect(screen.getByText('Ruby').nextSibling).toHaveTextContent('3 games');
    expect(screen.getByText('Zoe').nextSibling).toHaveTextContent('2 games');
  });
});
