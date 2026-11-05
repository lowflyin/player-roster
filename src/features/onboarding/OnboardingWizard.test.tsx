import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../App';
import { addPlayer, getSettings, saveSettings } from '../../db/db';

describe('first-run set-up', () => {
  it('walks through team name, players and the first game, then opens the Roster', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Step 1: team name
    expect(await screen.findByText('Step 1 of 3: Team Name')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Team Name'), 'Snowgums');
    await user.click(screen.getByRole('button', { name: 'Next' }));

    // Step 2: players. Next waits for at least one.
    expect(screen.getByText('Step 2 of 3: Players')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    for (const name of ['Ruby', 'Mia']) {
      await user.type(screen.getByLabelText('Player name'), name);
      await user.click(screen.getByRole('button', { name: 'Add' }));
    }
    expect(await screen.findByText('2 players added.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Next' }));

    // Step 3: first game
    expect(screen.getByRole('heading', { name: 'Create your first game' })).toBeInTheDocument();
    await user.type(screen.getByLabelText('Opponent'), 'Comets');
    await user.type(screen.getByLabelText('Court'), '2');
    await screen.findByLabelText('Ruby');
    await user.click(screen.getByRole('button', { name: 'Create game' }));

    // Lands on the Roster tab with the new game.
    const bar = await screen.findByRole('region', { name: 'Game' });
    expect(within(bar).getByText('Comets')).toBeInTheDocument();
    expect(screen.getByText('Snowgums')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Roster' })).toHaveAttribute('aria-current', 'page');
    expect((await getSettings()).onboardingDone).toBe(true);
  });

  it('can be skipped, and does not come back', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<App />);
    await user.click(await screen.findByRole('button', { name: 'Skip setup' }));
    expect(await screen.findByText(/No games yet/)).toBeInTheDocument();
    unmount();

    render(<App />);
    expect(await screen.findByText(/No games yet/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Skip setup' })).not.toBeInTheDocument();
  });

  it('keeps what was entered when going back a step', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(await screen.findByLabelText('Team Name'), 'Snowgums');
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('button', { name: 'Back' }));

    expect(screen.getByLabelText('Team Name')).toHaveValue('Snowgums');
  });

  it('is not shown to coaches who already have players', async () => {
    await addPlayer('Ruby');
    render(<App />);
    expect(await screen.findByRole('button', { name: 'Roster' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Skip setup' })).not.toBeInTheDocument();
  });

  it('is not shown once set-up is done', async () => {
    await saveSettings({ onboardingDone: true });
    render(<App />);
    expect(await screen.findByText(/No games yet/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Skip setup' })).not.toBeInTheDocument();
  });
});
