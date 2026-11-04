import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

describe('App', () => {
  it('adds a player to the roster', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText('Player name'), 'Ruby');
    await user.click(screen.getByRole('button', { name: 'Add' }));

    expect(await screen.findByText('Ruby')).toBeInTheDocument();
  });

  it('saves the quarter length setting', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Settings' }));
    await user.selectOptions(screen.getByLabelText('Quarter length'), '12');

    expect(await screen.findByText('Total game time: 48 minutes')).toBeInTheDocument();
  });
});
