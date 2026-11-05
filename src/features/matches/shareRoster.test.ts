import type { Match, Player } from '../../db/db';
import { rosterSheet, shareFileName, shareText } from './shareRoster';

const player = (id: string, name: string): Player => ({
  id,
  name,
  preferredPositions: [],
  createdAt: 0,
});

const match: Match = {
  id: 'm1',
  opponent: 'Northside Comets',
  court: '3',
  date: '2026-11-07',
  quarterMinutes: 10,
  playerIds: ['a', 'b'],
  quarters: [{ GS: 'a', GA: 'b' }, { GS: 'a' }, { GS: 'b' }, {}],
  createdAt: 0,
};

describe('rosterSheet', () => {
  it('collects the bar details and each player’s positions per quarter', () => {
    const sheet = rosterSheet(match, [player('a', 'Ava'), player('b', 'Bea')], ' Snowgums ');

    expect(sheet.teamName).toBe('Snowgums');
    expect(sheet.court).toBe('3');
    expect(sheet.opponent).toBe('Northside Comets');
    expect(sheet.rows).toEqual([
      { name: 'Ava', played: 2, cells: ['GS', 'GS', undefined, undefined] },
      { name: 'Bea', played: 2, cells: ['GA', undefined, 'GS', undefined] },
    ]);
    expect(sheet.filled).toEqual([2, 1, 1, 0]);
  });

  it('fills in a missing court and opponent', () => {
    const sheet = rosterSheet({ ...match, court: '', opponent: '' }, [], '');
    expect(sheet.court).toBe('–');
    expect(sheet.opponent).toBe('Opponent not set');
  });

  it('describes the game in one line for the message', () => {
    const sheet = rosterSheet(match, [], 'Snowgums');
    expect(shareText(sheet)).toMatch(/^Snowgums vs Northside Comets, Court 3, /);
    expect(shareFileName(match)).toBe('roster-2026-11-07.png');
  });
});
