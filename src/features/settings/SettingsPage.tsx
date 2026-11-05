import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { DEFAULT_SETTINGS, db, saveSettings } from '../../db/db';

export function SettingsPage() {
  const settings = useLiveQuery(() => db.settings.get('team'), []) ?? DEFAULT_SETTINGS;
  // Keep what's typed locally so fast typing isn't overwritten while each save lands.
  const [teamName, setTeamName] = useState<string | null>(null);

  return (
    <section>
      <h2 className="visually-hidden">Team settings</h2>
      {/* Keeps the space the heading used to take, so the layout does not move up. */}
      <div className="heading-space" aria-hidden="true" />

      <div className="field">
        <label htmlFor="team-name">Team Name</label>
        <input
          id="team-name"
          value={teamName ?? settings.teamName}
          onChange={(e) => {
            setTeamName(e.target.value);
            void saveSettings({ teamName: e.target.value });
          }}
          placeholder="e.g. Under 11 Diamonds"
        />
      </div>

      <p className="hint version">Version {__APP_VERSION__}</p>
    </section>
  );
}
