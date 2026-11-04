import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

describe('App', () => {
  it('adds a player on the Team tab and lists them on the Roster tab', async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(await screen.findByText(/No players yet/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Team' }));
    await user.type(screen.getByLabelText('Player name'), 'Ruby');
    await user.click(screen.getByRole('button', { name: 'Add' }));
    expect(await screen.findByText('Ruby')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Roster' }));
    const list = await screen.findByRole('list', { name: 'Players' });
    expect(within(list).getByText('Ruby')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Remove Ruby' })).not.toBeInTheDocument();
  });

  it('saves the quarter length setting', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Settings' }));
    await user.selectOptions(screen.getByLabelText('Quarter length'), '12');

    expect(await screen.findByText('Total game time: 48 minutes')).toBeInTheDocument();
  });
});
