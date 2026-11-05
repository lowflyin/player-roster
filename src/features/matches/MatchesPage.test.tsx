import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { addPlayer } from '../../db/db';
import { MatchesPage } from './MatchesPage';

describe('MatchesPage', () => {
  it('creates a match with positions allocated and lets the coach swap them', async () => {
    await addPlayer('Ruby');
    await addPlayer('Mia');
    const user = userEvent.setup();
    render(<MatchesPage />);

    await user.click(screen.getByRole('button', { name: 'New game' }));
    await user.type(screen.getByLabelText('Opponent'), 'Comets');
    await user.type(screen.getByLabelText('Court'), '3');
    expect(await screen.findByLabelText('Mia')).toBeChecked();
    await user.click(screen.getByRole('button', { name: 'Create game' }));

    const bar = await screen.findByRole('region', { name: 'Game' });
    expect(bar).toHaveTextContent('Court3');
    expect(bar).toHaveTextContent('Comets');

    // Allocated in squad order (alphabetical): Mia GS, Ruby GA, all four quarters.
    expect(screen.getByRole('button', { name: 'Mia, quarter 4: Goal Shooter' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Ruby, quarter 1: Goal Attack' })).toBeVisible();

    // Manual override: Ruby to GS in Q1 swaps with Mia.
    await user.click(screen.getByRole('button', { name: 'Ruby, quarter 1: Goal Attack' }));
    const sheet = screen.getByRole('dialog');
    expect(within(sheet).getByRole('button', { name: 'Goal Shooter' })).toHaveTextContent(
      'Swap Mia',
    );
    await user.click(within(sheet).getByRole('button', { name: 'Goal Shooter' }));

    expect(
      await screen.findByRole('button', { name: 'Ruby, quarter 1: Goal Shooter' }),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Mia, quarter 1: Goal Attack' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Ruby, quarter 2: Goal Attack' })).toBeVisible();
  });
});
