import type { Match, Player } from '../../db/db';
import { rosterMessage, rosterSheet, shareFileName, shareText, whatsAppUrl } from './shareRoster';

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

describe('rosterMessage', () => {
  it('lists who plays each position and who is off, quarter by quarter', () => {
    const sheet = rosterSheet(match, [player('a', 'Ava'), player('b', 'Bea')], 'Snowgums');
    const lines = rosterMessage(sheet).split('\n');

    expect(lines[0]).toBe('*Snowgums vs Northside Comets*');
    expect(lines[1]).toMatch(/^Court 3 · /);
    expect(lines).toContain(
      '*Q1:* GS Ava, GA Bea, WA (open), C (open), WD (open), GD (open), GK (open)',
    );
    expect(lines).toContain('Subs: Bea'); // Q2: Bea is off
    expect(lines.filter((line) => line.startsWith('*Q'))).toHaveLength(4);
  });

  it('opens WhatsApp with the message ready to send', () => {
    expect(whatsAppUrl('Snowgums vs ZYX & co')).toBe(
      'https://wa.me/?text=Snowgums%20vs%20ZYX%20%26%20co',
    );
  });
});
