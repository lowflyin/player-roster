import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { DEFAULT_SETTINGS, db, saveSettings } from '../../db/db';

export function SettingsPage() {
  const settings = useLiveQuery(() => db.settings.get('team'), []) ?? DEFAULT_SETTINGS;
  // The box always opens empty, showing the "Enter Team Name" prompt; typing a
  // name saves it. An empty box leaves the saved name as it is.
  const [teamName, setTeamName] = useState('');

  return (
    <section>
      <h2 className="visually-hidden">Team settings</h2>
      {/* Keeps the space the heading used to take, so the layout does not move up. */}
      <div className="heading-space" aria-hidden="true" />

      <div className="field">
        <label htmlFor="team-name">Team Name</label>
        <input
          id="team-name"
          value={teamName}
          onChange={(e) => {
            setTeamName(e.target.value);
            const name = e.target.value.trim();
            if (name) void saveSettings({ teamName: name });
          }}
          placeholder="Enter Team Name"
          autoComplete="off"
        />
        {settings.teamName && (
          <p className="hint" aria-live="polite">
            Current team name: {settings.teamName}
          </p>
        )}
      </div>

      <p className="hint version">Version {__APP_VERSION__}</p>
    </section>
  );
}
