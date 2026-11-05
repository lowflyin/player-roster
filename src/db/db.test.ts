import { homePositions } from '../domain/rotation';
import { quartersPlayed } from '../domain/lineup';
import {
  addPlayer,
  createMatch,
  db,
  getSettings,
  reallocateMatch,
  saveSettings,
  setMatchPlayerSelected,
} from './db';

describe('createMatch', () => {
  it('moves every player to a new position the following week', async () => {
    const ids: string[] = [];
    for (const name of ['Ava', 'Chloe', 'Grace', 'Harper', 'Isla', 'Lily', 'Mia', 'Ruby']) {
      ids.push((await addPlayer(name)).id);
    }
    const details = { opponent: '', court: '', playerIds: ids };

    const week1 = await createMatch({ ...details, date: '2026-11-07' });
    const week2 = await createMatch({ ...details, date: '2026-11-14' });

    const homes1 = homePositions(week1.quarters, week1.playerIds);
    const homes2 = homePositions(week2.quarters, week2.playerIds);
    for (const id of ids) {
      if (homes1.has(id) && homes2.has(id)) expect(homes2.get(id)).not.toBe(homes1.get(id));
    }
    // Last week's substitute gets a position this week.
    const sub1 = ids.find((id) => !homes1.has(id))!;
    expect(homes2.has(sub1)).toBe(true);
  });

  it('re-allocates an existing game from the weeks before it', async () => {
    const ids: string[] = [];
    for (const name of ['Ava', 'Chloe', 'Grace', 'Harper', 'Isla', 'Lily', 'Mia']) {
      ids.push((await addPlayer(name)).id);
    }
    const details = { opponent: '', court: '', playerIds: ids };
    const week1 = await createMatch({ ...details, date: '2026-11-07' });
    const week2 = await createMatch({ ...details, date: '2026-11-14' });
    // A game made before weekly planning existed: same positions as week 1.
    await db.matches.update(week2.id, { quarters: week1.quarters });

    await reallocateMatch(week2.id);

    const after = (await db.matches.get(week2.id))!;
    const homes1 = homePositions(week1.quarters, week1.playerIds);
    const homes2 = homePositions(after.quarters, after.playerIds);
    for (const id of ids) expect(homes2.get(id)).not.toBe(homes1.get(id));
    // Week 1 itself is untouched.
    expect((await db.matches.get(week1.id))!.quarters).toEqual(week1.quarters);
  });

  it('swaps positions every time Re-allocate is pressed, even in the first game', async () => {
    const ids: string[] = [];
    for (const name of ['Ava', 'Chloe', 'Grace', 'Harper', 'Isla', 'Lily', 'Mia', 'Ruby']) {
      ids.push((await addPlayer(name)).id);
    }
    const match = await createMatch({
      opponent: '',
      court: '',

      playerIds: ids,
      date: '2026-11-07',
    });

    // Every press: nobody goes back to a position they had in any earlier layout
    // of this game, and the substitute before the press gets a position.
    const layouts = [homePositions(match.quarters, match.playerIds)];
    for (let press = 0; press < 3; press++) {
      await reallocateMatch(match.id);
      const after = (await db.matches.get(match.id))!;
      const homes = homePositions(after.quarters, after.playerIds);
      for (const id of ids) {
        const earlier = layouts.map((l) => l.get(id)).filter(Boolean);
        if (homes.has(id))
          expect({ press, id, repeat: earlier.includes(homes.get(id)) }).toEqual({
            press,
            id,
            repeat: false,
          });
      }
      const subBefore = ids.find((id) => !layouts.at(-1)!.has(id))!;
      expect(homes.has(subBefore)).toBe(true);
      layouts.push(homes);
    }
  });
});

describe('setMatchPlayerSelected', () => {
  it('keeps last week’s court-time rules when a player is unticked', async () => {
    const ids: string[] = [];
    for (const name of ['Ava', 'Chloe', 'Grace', 'Harper', 'Isla', 'Lily', 'Mia', 'Ruby', 'Zoe']) {
      ids.push((await addPlayer(name)).id);
    }
    const eight = ids.slice(0, 8);
    const week1 = await createMatch({
      opponent: '',
      court: '',

      playerIds: eight,
      date: '2026-11-07',
    });
    const week2 = await createMatch({
      opponent: '',
      court: '',

      playerIds: ids,
      date: '2026-11-14',
    });

    // Zoe can't make it: back to the same 8 players as week 1.
    await setMatchPlayerSelected(week2.id, ids[8]!, false);

    const after = (await db.matches.get(week2.id))!;
    for (const id of eight) {
      if (quartersPlayed(week1.quarters, id) === 4) {
        expect(quartersPlayed(after.quarters, id)).toBeLessThan(4);
      }
    }
  });
});

describe('saveSettings', () => {
  it('keeps every change when saves overlap', async () => {
    await Promise.all([
      saveSettings({ teamName: 'S' }),
      saveSettings({ currentMatchId: 'm1' }),
      saveSettings({ teamName: 'Snowgums' }),
    ]);
    expect(await getSettings()).toMatchObject({ teamName: 'Snowgums', currentMatchId: 'm1' });
  });
});
