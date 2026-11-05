import { homePositions } from '../domain/rotation';
import { addPlayer, createMatch, db, reallocateMatch } from './db';

describe('createMatch', () => {
  it('moves every player to a new position the following week', async () => {
    const ids: string[] = [];
    for (const name of ['Ava', 'Chloe', 'Grace', 'Harper', 'Isla', 'Lily', 'Mia', 'Ruby']) {
      ids.push((await addPlayer(name)).id);
    }
    const details = { opponent: '', court: '', quarterMinutes: 10, playerIds: ids };

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
    const details = { opponent: '', court: '', quarterMinutes: 10, playerIds: ids };
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
});
