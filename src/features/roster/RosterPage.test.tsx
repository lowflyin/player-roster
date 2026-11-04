import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { addPlayer } from '../../db/db';
import { RosterPage } from './RosterPage';

const NAMES = ['Ava', 'Chloe', 'Grace', 'Harper', 'Isla', 'Lily', 'Mia', 'Ruby'];

async function createMatch(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: 'New match' }));
  await user.type(screen.getByLabelText('Opponent'), 'Northside Comets');
  await user.type(screen.getByLabelText('Court'), '4');
  await screen.findByLabelText('Ruby');
  await user.click(screen.getByRole('button', { name: 'Create match' }));
  await screen.findByRole('region', { name: 'Match' });
}

const cells = (name: string) =>
  screen.getAllByRole('button', { name: new RegExp(`^${name}, quarter`) });
const onCourtCount = (name: string) =>
  cells(name).filter((cell) => !cell.getAttribute('aria-label')!.endsWith('Substitute')).length;

describe('RosterPage', () => {
  it('shows the court and opponent bar and a fair rotation for 8 players', async () => {
    for (const name of NAMES) await addPlayer(name);
    const user = userEvent.setup();
    render(<RosterPage />);
    await createMatch(user);

    const bar = screen.getByRole('region', { name: 'Match' });
    expect(bar).toHaveTextContent('Court4');
    expect(bar).toHaveTextContent('vsNorthside Comets');

    // 28 player-quarters across 8 players: four play all four, four play three.
    const counts = NAMES.map(onCourtCount);
    expect(counts.reduce((a, b) => a + b, 0)).toBe(28);
    expect(counts.filter((c) => c === 4)).toHaveLength(4);
    expect(counts.filter((c) => c === 3)).toHaveLength(4);
    expect(screen.getAllByText('7/7')).toHaveLength(4);
  });

  it('drops an unticked player from the rotation', async () => {
    for (const name of NAMES) await addPlayer(name);
    const user = userEvent.setup();
    render(<RosterPage />);
    await createMatch(user);

    await user.click(screen.getByRole('checkbox', { name: 'Harper' }));

    await waitFor(() => expect(screen.getAllByText('4/4 on court')).toHaveLength(7));
    expect(screen.queryByRole('button', { name: /^Harper, quarter/ })).not.toBeInTheDocument();
    expect(screen.getAllByText('7/7')).toHaveLength(4);
  });

  it('edits the court and opponent', async () => {
    await addPlayer('Ruby');
    const user = userEvent.setup();
    render(<RosterPage />);
    await createMatch(user);

    await user.click(screen.getByRole('button', { name: 'Edit court and opponent' }));
    await user.clear(screen.getByLabelText('Court'));
    await user.type(screen.getByLabelText('Court'), '7');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByRole('region', { name: 'Match' })).toHaveTextContent('Court7');
  });
});
