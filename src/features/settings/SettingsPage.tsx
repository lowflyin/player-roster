import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { DEFAULT_SETTINGS, db, saveSettings } from '../../db/db';

export function SettingsPage() {
  const settings = useLiveQuery(() => db.settings.get('team'), []) ?? DEFAULT_SETTINGS;
  // Keep what's typed locally so fast typing isn't overwritten while each save lands.
  const [teamName, setTeamName] = useState<string | null>(null);

  return (
    <section>
      <h2>Team settings</h2>

      <div className="field">
        <label htmlFor="team-name">Team name</label>
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

      <p className="hint">Version {__APP_VERSION__}</p>
    </section>
  );
}
