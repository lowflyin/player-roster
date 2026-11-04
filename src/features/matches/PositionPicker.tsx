import { useEffect, useRef } from 'react';
import type { Player } from '../../db/db';
import { POSITION_NAMES, POSITION_ZONES, type Position } from '../../domain/netball';
import { positionOf, type QuarterLineup } from '../../domain/lineup';

// Laid out like the court, attacking end first.
const COURT_ROWS: Position[][] = [['GS', 'GA', 'WA'], ['C'], ['WD', 'GD', 'GK']];

interface Props {
  player: Player;
  quarter: number;
  lineup: QuarterLineup;
  nameOf: (playerId: string) => string;
  onSelect: (position: Position | null) => void;
  onClose: () => void;
}

/** Bottom sheet for choosing a player's position in one quarter. */
export function PositionPicker({ player, quarter, lineup, nameOf, onSelect, onClose }: Props) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const current = positionOf(lineup, player.id);

  useEffect(() => {
    sheetRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        ref={sheetRef}
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="picker-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="picker-title">
          {player.name} · Quarter {quarter + 1}
        </h3>

        <div className="picker-court">
          {COURT_ROWS.map((row) => (
            <div className="picker-row" key={row.join()}>
              {row.map((position) => {
                const holder = lineup[position];
                const isCurrent = position === current;
                return (
                  <button
                    key={position}
                    className={`picker-option zone-${POSITION_ZONES[position]}`}
                    aria-pressed={isCurrent}
                    aria-label={POSITION_NAMES[position]}
                    onClick={() => onSelect(position)}
                  >
                    <span className="picker-abbr">{position}</span>
                    <span className="picker-holder">
                      {isCurrent
                        ? 'Current'
                        : holder
                          ? `${current ? 'Swap' : 'Replace'} ${nameOf(holder)}`
                          : 'Open'}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div className="form-actions">
          <button className="secondary" aria-pressed={!current} onClick={() => onSelect(null)}>
            Bench
          </button>
          <button className="secondary" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
