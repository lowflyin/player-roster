import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

describe('App', () => {
  it('adds a player on the Team tab and puts them in a match roster', async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(await screen.findByText(/No games yet/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Team' }));
    await user.type(screen.getByLabelText('Player name'), 'Ruby');
    await user.click(screen.getByRole('button', { name: 'Add' }));
    expect(await screen.findByText('Ruby')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Roster' }));
    await user.click(await screen.findByRole('button', { name: 'New game' }));
    await screen.findByLabelText('Ruby');
    await user.click(screen.getByRole('button', { name: 'Create game' }));

    const bar = await screen.findByRole('region', { name: 'Game' });
    expect(within(bar).getByText('Opponent not set')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ruby, quarter 1: Goal Shooter' })).toBeVisible();
  });

  it('saves the team name setting, with no quarter length to set', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Settings' }));
    await user.type(screen.getByLabelText('Team name'), 'Diamonds');

    expect(await screen.findByDisplayValue('Diamonds')).toBeInTheDocument();
    expect(screen.queryByLabelText('Quarter length')).not.toBeInTheDocument();
  });
});
