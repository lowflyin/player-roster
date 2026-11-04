import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

describe('App', () => {
  it('adds a player on the Team tab and puts them in a match roster', async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(await screen.findByText(/No matches yet/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Team' }));
    await user.type(screen.getByLabelText('Player name'), 'Ruby');
    await user.click(screen.getByRole('button', { name: 'Add' }));
    expect(await screen.findByText('Ruby')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Roster' }));
    await user.click(await screen.findByRole('button', { name: 'New match' }));
    await screen.findByLabelText('Ruby');
    await user.click(screen.getByRole('button', { name: 'Create match' }));

    const bar = await screen.findByRole('region', { name: 'Match' });
    expect(within(bar).getByText('Opponent not set')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ruby, quarter 1: Goal Shooter' })).toBeVisible();
  });

  it('saves the quarter length setting', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Settings' }));
    await user.selectOptions(screen.getByLabelText('Quarter length'), '12');

    expect(await screen.findByText('Total game time: 48 minutes')).toBeInTheDocument();
  });
});
