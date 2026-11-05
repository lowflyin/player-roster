import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { addPlayer } from '../../db/db';
import { RosterPage } from './RosterPage';
import { shareRosterImage } from '../matches/shareRoster';

// Drawing the picture needs a real canvas, which the test browser doesn't have.
vi.mock('../matches/shareRoster', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../matches/shareRoster')>()),
  shareRosterImage: vi.fn(async () => 'shared'),
}));

const NAMES = ['Ava', 'Chloe', 'Grace', 'Harper', 'Isla', 'Lily', 'Mia', 'Ruby'];

async function createMatch(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: 'New Game' }));
  await user.type(screen.getByLabelText('Opponent'), 'Northside Comets');
  await user.type(screen.getByLabelText('Court'), '4');
  await screen.findByLabelText('Ruby');
  await user.click(screen.getByRole('button', { name: 'Create game' }));
  await screen.findByRole('region', { name: 'Game' });
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

    const bar = screen.getByRole('region', { name: 'Game' });
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

    expect(await screen.findByRole('region', { name: 'Game' })).toHaveTextContent('Court7');
  });

  it('deletes the match from the edit form', async () => {
    await addPlayer('Ruby');
    const user = userEvent.setup();
    render(<RosterPage />);
    await createMatch(user);

    await user.click(screen.getByRole('button', { name: 'Edit court and opponent' }));
    await user.click(screen.getByRole('button', { name: 'Delete game' }));
    const dialog = screen.getByRole('alertdialog', { name: 'Delete this game?' });
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));

    expect(await screen.findByText(/No games yet/)).toBeInTheDocument();
  });

  it('re-allocates after confirming in the app', async () => {
    for (const name of NAMES) await addPlayer(name);
    const user = userEvent.setup();
    render(<RosterPage />);
    await createMatch(user);

    // Move Ava (GS) to the bench in Q1, then re-allocate: the gap is filled and
    // players swap, so Ava is no longer the Goal Shooter.
    await user.click(screen.getByRole('button', { name: 'Ava, quarter 1: Goal Shooter' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Bench' }));
    expect(await screen.findByText('6/7')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Re-allocate positions' }));
    const dialog = screen.getByRole('alertdialog', { name: 'Re-allocate positions?' });
    await user.click(within(dialog).getByRole('button', { name: 'Re-allocate' }));

    await waitFor(() => expect(screen.getAllByText('7/7')).toHaveLength(4));
    const avaAtGS = screen.queryAllByRole('button', { name: /^Ava, quarter \d: Goal Shooter$/ });
    expect(avaAtGS.length).toBeLessThan(2);
  });

  it('closes an open edit form when switching match', async () => {
    await addPlayer('Ruby');
    const user = userEvent.setup();
    render(<RosterPage />);
    await createMatch(user); // vs Northside Comets
    await createMatch(user); // a second one, now selected

    await user.click(screen.getByRole('button', { name: 'Edit court and opponent' }));
    const select = screen.getByLabelText('Game');
    // Both matches share a date, so pick whichever one isn't selected.
    const other = within(select)
      .getAllByRole<HTMLOptionElement>('option')
      .find((option) => !option.selected)!;
    await user.selectOptions(select, other);

    expect(await screen.findByRole('region', { name: 'Game' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
  });

  it('lists players in the same order every match', async () => {
    for (const name of NAMES) await addPlayer(name);
    const user = userEvent.setup();
    render(<RosterPage />);
    const rowNames = () =>
      screen
        .getAllByRole('rowheader')
        .map((cell) => cell.querySelector('.matrix-name')?.textContent);

    await createMatch(user);
    const week1 = rowNames().filter(Boolean);
    await createMatch(user); // positions rotate in the second match
    const week2 = rowNames().filter(Boolean);

    expect(week1).toEqual([...NAMES].sort());
    expect(week2).toEqual(week1);
  });

  it('shares the roster with the court and opponent', async () => {
    for (const name of NAMES) await addPlayer(name);
    const user = userEvent.setup();
    render(<RosterPage />);
    await createMatch(user);

    await user.click(screen.getByRole('button', { name: 'Share' }));

    await waitFor(() => expect(shareRosterImage).toHaveBeenCalled());
    const [sheet, fileName] = vi.mocked(shareRosterImage).mock.calls.at(-1)!;
    expect(sheet.court).toBe('4');
    expect(sheet.opponent).toBe('Northside Comets');
    expect(sheet.rows.map((row) => row.name)).toEqual([...NAMES].sort());
    expect(fileName).toMatch(/^roster-\d{4}-\d{2}-\d{2}\.png$/);
  });

  it('opens the print screen for Print / PDF', async () => {
    await addPlayer('Ruby');
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    const user = userEvent.setup();
    render(<RosterPage />);
    await createMatch(user);

    await user.click(screen.getByRole('button', { name: 'Print / PDF' }));

    expect(print).toHaveBeenCalled();
    print.mockRestore();
  });

  it('opens WhatsApp with the roster typed out', async () => {
    for (const name of NAMES) await addPlayer(name);
    const user = userEvent.setup();
    render(<RosterPage />);
    await createMatch(user);

    const link = screen.getByRole('link', { name: 'WhatsApp' });
    const url = new URL(link.getAttribute('href')!);
    expect(url.origin + url.pathname).toBe('https://wa.me/');
    const message = url.searchParams.get('text')!;
    expect(message).toContain('vs Northside Comets');
    expect(message).toContain('Court 4');
    expect(message.match(/^\*Q\d:\*/gm)).toHaveLength(4);
  });
});
