import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { addPlayer } from '../../db/db';
import { MatchesPage } from './MatchesPage';

describe('MatchesPage', () => {
  it('creates a match and assigns positions per quarter', async () => {
    await addPlayer('Ruby');
    await addPlayer('Mia');
    const user = userEvent.setup();
    render(<MatchesPage />);

    await user.click(screen.getByRole('button', { name: 'New match' }));
    await user.type(screen.getByLabelText('Opponent'), 'Comets');
    expect(await screen.findByLabelText('Mia')).toBeChecked();
    await user.click(screen.getByRole('button', { name: 'Create match' }));

    expect(await screen.findByRole('heading', { name: 'vs Comets' })).toBeInTheDocument();

    // Ruby to Goal Shooter in Q1.
    await user.click(screen.getByRole('button', { name: 'Ruby, quarter 1: Bench' }));
    let sheet = screen.getByRole('dialog');
    await user.click(within(sheet).getByRole('button', { name: 'Goal Shooter' }));
    expect(
      await screen.findByRole('button', { name: 'Ruby, quarter 1: Goal Shooter' }),
    ).toHaveTextContent('GS');

    // Mia to Centre, then swap Mia into GS: Ruby takes Centre.
    await user.click(screen.getByRole('button', { name: 'Mia, quarter 1: Bench' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Centre' }));
    await user.click(await screen.findByRole('button', { name: 'Mia, quarter 1: Centre' }));
    sheet = screen.getByRole('dialog');
    expect(within(sheet).getByRole('button', { name: 'Goal Shooter' })).toHaveTextContent(
      'Swap Ruby',
    );
    await user.click(within(sheet).getByRole('button', { name: 'Goal Shooter' }));

    expect(await screen.findByRole('button', { name: 'Ruby, quarter 1: Centre' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Mia, quarter 1: Goal Shooter' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Ruby, quarter 2: Bench' })).toBeVisible();
  });
});
