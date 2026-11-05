import type { Match, Player } from '../../db/db';
import { POSITIONS, POSITION_ZONES, type Position, type Zone } from '../../domain/netball';
import { positionOf, quartersPlayed, unfilledPositions } from '../../domain/lineup';
import { formatMatchDate } from './format';

/** Everything shown on a shared or printed roster, ready to draw. */
export interface RosterSheet {
  teamName: string;
  court: string;
  opponent: string;
  date: string;
  quarters: number;
  rows: { name: string; played: number; cells: (Position | undefined)[] }[];
  /** Positions filled in each quarter, out of seven. */
  filled: number[];
}

export function rosterSheet(match: Match, squad: Player[], teamName: string): RosterSheet {
  return {
    teamName: teamName.trim(),
    court: match.court?.trim() || '–',
    opponent: match.opponent.trim() || 'Opponent not set',
    date: formatMatchDate(match.date),
    quarters: match.quarters.length,
    rows: squad.map((player) => ({
      name: player.name,
      played: quartersPlayed(match.quarters, player.id),
      cells: match.quarters.map((lineup) => positionOf(lineup, player.id)),
    })),
    filled: match.quarters.map((lineup) => POSITIONS.length - unfilledPositions(lineup).length),
  };
}

/** One-line description to go with the shared picture. */
export function shareText(sheet: RosterSheet): string {
  const team = sheet.teamName ? `${sheet.teamName} ` : '';
  return `${team}vs ${sheet.opponent}, Court ${sheet.court}, ${sheet.date}`;
}

export function shareFileName(match: Match): string {
  return `roster-${match.date}.png`;
}

/**
 * The roster as a WhatsApp text message: the game on the first lines, then
 * who plays each position (in court order) and who's off, quarter by quarter.
 */
export function rosterMessage(sheet: RosterSheet): string {
  const lines = [
    `*${sheet.teamName ? `${sheet.teamName} ` : ''}vs ${sheet.opponent}*`,
    `Court ${sheet.court} · ${sheet.date}`,
  ];
  for (let q = 0; q < sheet.quarters; q++) {
    const at = (position: Position) => sheet.rows.find((row) => row.cells[q] === position)?.name;
    const court = POSITIONS.map((position) => `${position} ${at(position) ?? '(open)'}`);
    const subs = sheet.rows.filter((row) => !row.cells[q]).map((row) => row.name);
    lines.push('', `*Q${q + 1}:* ${court.join(', ')}`);
    if (subs.length) lines.push(`Subs: ${subs.join(', ')}`);
  }
  return lines.join('\n');
}

/** Opens WhatsApp (the app on a phone) with `text` ready to send to a chat of the user's choice. */
export function whatsAppUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

// The picture always uses the light colours, whatever the phone's theme, so it
// reads the same for everyone it's sent to.
const COLOURS = {
  background: '#ffffff',
  text: '#1d1b20',
  muted: '#625b71',
  border: '#ddd6e8',
  brand: '#ffcc00',
  danger: '#b3261e',
};
const ZONE_COLOURS: Record<Zone, { fill: string; text: string }> = {
  attack: { fill: '#d6453d', text: '#ffffff' },
  centre: { fill: '#2e9d5b', text: '#ffffff' },
  defence: { fill: '#2f6fd1', text: '#ffffff' },
};
const FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

/** Draws the roster as a PNG picture: team name, court and opponent bar, then the grid. */
export async function drawRosterImage(sheet: RosterSheet): Promise<Blob> {
  const width = 1000;
  const pad = 40;
  const rowHeight = 76;
  const nameWidth = 300;
  const cellGap = 10;
  const cellWidth = (width - pad * 2 - nameWidth - cellGap * sheet.quarters) / sheet.quarters;

  const titleHeight = sheet.teamName ? 64 : 0;
  const barTop = pad + titleHeight;
  const barHeight = 120;
  const legendTop = barTop + barHeight + 28;
  const headerTop = legendTop + 48;
  const rowsTop = headerTop + 44;
  const height = rowsTop + sheet.rows.length * rowHeight + 60 + pad;

  const scale = 2; // sharp on high-density screens
  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Drawing is not supported on this device.');
  ctx.scale(scale, scale);
  ctx.textBaseline = 'middle';

  const text = (value: string, x: number, y: number, size: number, options: TextOptions = {}) => {
    ctx.font = `${options.weight ?? 400} ${size}px ${FONT}`;
    ctx.fillStyle = options.colour ?? COLOURS.text;
    ctx.textAlign = options.align ?? 'left';
    ctx.fillText(fit(ctx, value, options.maxWidth ?? Infinity), x, y);
  };

  ctx.fillStyle = COLOURS.background;
  ctx.fillRect(0, 0, width, height);

  if (sheet.teamName) {
    text(sheet.teamName, pad, pad + 24, 34, { weight: 700, maxWidth: width - pad * 2 });
  }

  // Court and opponent bar, like the one in the app.
  roundRect(ctx, pad, barTop, width - pad * 2, barHeight, 18);
  ctx.fillStyle = COLOURS.background;
  ctx.fill();
  ctx.strokeStyle = COLOURS.border;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = COLOURS.brand;
  ctx.fillRect(pad, barTop + 1, 10, barHeight - 2);
  const courtCentre = pad + 90;
  text('COURT', courtCentre, barTop + 36, 18, {
    weight: 600,
    colour: COLOURS.muted,
    align: 'center',
  });
  text(sheet.court, courtCentre, barTop + 80, 44, { weight: 700, align: 'center', maxWidth: 130 });
  ctx.fillStyle = COLOURS.border;
  ctx.fillRect(pad + 165, barTop + 20, 2, barHeight - 40);
  const infoLeft = pad + 190;
  const infoWidth = width - pad - 20 - infoLeft;
  text('VS', infoLeft, barTop + 30, 18, { weight: 600, colour: COLOURS.muted });
  text(sheet.opponent, infoLeft, barTop + 64, 32, { weight: 700, maxWidth: infoWidth });
  text(sheet.date, infoLeft, barTop + 98, 20, { colour: COLOURS.muted, maxWidth: infoWidth });

  // Legend
  let legendX = pad;
  for (const [zone, label] of [
    ['attack', 'Attack'],
    ['centre', 'Centre'],
    ['defence', 'Defence'],
  ] as const) {
    roundRect(ctx, legendX, legendTop - 10, 20, 20, 5);
    ctx.fillStyle = ZONE_COLOURS[zone].fill;
    ctx.fill();
    text(label, legendX + 30, legendTop, 20, { colour: COLOURS.muted });
    legendX += 150;
  }

  // Grid header
  const cellLeft = (q: number) => pad + nameWidth + cellGap + q * (cellWidth + cellGap);
  text('Player', pad, headerTop, 20, { weight: 600, colour: COLOURS.muted });
  for (let q = 0; q < sheet.quarters; q++) {
    text(`Q${q + 1}`, cellLeft(q) + cellWidth / 2, headerTop, 20, {
      weight: 600,
      colour: COLOURS.muted,
      align: 'center',
    });
  }

  // Player rows
  sheet.rows.forEach((row, i) => {
    const top = rowsTop + i * rowHeight;
    text(row.name, pad, top + 26, 26, { weight: 600, maxWidth: nameWidth - 10 });
    text(`${row.played}/${sheet.quarters} on court`, pad, top + 54, 18, { colour: COLOURS.muted });
    row.cells.forEach((position, q) => {
      const x = cellLeft(q);
      roundRect(ctx, x, top + 4, cellWidth, rowHeight - 12, 14);
      if (position) {
        const zone = ZONE_COLOURS[POSITION_ZONES[position]];
        ctx.fillStyle = zone.fill;
        ctx.fill();
        text(position, x + cellWidth / 2, top + rowHeight / 2 - 2, 28, {
          weight: 700,
          colour: zone.text,
          align: 'center',
        });
      } else {
        // Blank square: a substitute that quarter.
        ctx.setLineDash([6, 6]);
        ctx.strokeStyle = COLOURS.border;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.setLineDash([]);
      }
    });
  });

  // Positions filled per quarter
  const footTop = rowsTop + sheet.rows.length * rowHeight + 30;
  text('On court', pad, footTop, 20, { weight: 600 });
  sheet.filled.forEach((count, q) => {
    text(`${count}/${POSITIONS.length}`, cellLeft(q) + cellWidth / 2, footTop, 20, {
      weight: count === POSITIONS.length ? 400 : 700,
      colour: count === POSITIONS.length ? COLOURS.muted : COLOURS.danger,
      align: 'center',
    });
  });

  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not create the picture.'))),
      'image/png',
    ),
  );
}

interface TextOptions {
  weight?: number;
  colour?: string;
  align?: CanvasTextAlign;
  maxWidth?: number;
}

/** Shortens text with an ellipsis so it fits in `maxWidth`. */
function fit(ctx: CanvasRenderingContext2D, value: string, maxWidth: number): string {
  if (ctx.measureText(value).width <= maxWidth) return value;
  let short = value;
  while (short.length > 1 && ctx.measureText(`${short}…`).width > maxWidth)
    short = short.slice(0, -1);
  return `${short}…`;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export type ShareResult = 'shared' | 'cancelled' | 'downloaded';

/**
 * Opens the phone's share menu with the roster picture (WhatsApp, Messages,
 * email…). Where sharing files isn't supported, such as some desktop browsers,
 * the picture is downloaded instead so it can be sent by hand.
 */
export async function shareRosterImage(sheet: RosterSheet, fileName: string): Promise<ShareResult> {
  const blob = await drawRosterImage(sheet);
  const file = new File([blob], fileName, { type: 'image/png' });
  const data: ShareData = { files: [file], title: 'Roster', text: shareText(sheet) };

  if (navigator.canShare?.(data)) {
    try {
      await navigator.share(data);
      return 'shared';
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
      throw error;
    }
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return 'downloaded';
}
