import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { saveSettings } from './db/db';

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
    await user.click(await screen.findByRole('button', { name: 'New Game' }));
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
    await user.type(screen.getByLabelText('Team Name'), 'Diamonds');

    expect(await screen.findByDisplayValue('Diamonds')).toBeInTheDocument();
    expect(screen.queryByLabelText('Quarter length')).not.toBeInTheDocument();
  });

  it('shows the team name at the top of the Roster tab', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Settings' }));
    await user.type(screen.getByLabelText('Team Name'), 'Diamonds');
    await user.click(screen.getByRole('button', { name: 'Roster' }));

    expect(await screen.findByText('Diamonds')).toBeInTheDocument();
  });

  it('opens Team Name empty with the prompt, showing the saved name below', async () => {
    await saveSettings({ teamName: 'Snowgums' });
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Settings' }));

    const box = screen.getByLabelText('Team Name');
    expect(box).toHaveValue('');
    expect(box).toHaveAttribute('placeholder', 'Enter Team Name');
    expect(await screen.findByText('Current team name: Snowgums')).toBeInTheDocument();
  });
});
