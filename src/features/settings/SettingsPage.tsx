import { useLiveQuery } from 'dexie-react-hooks';
import { DEFAULT_SETTINGS, db, saveSettings } from '../../db/db';
import { QUARTER_LENGTH_OPTIONS, totalGameMinutes } from '../../domain/netball';

export function SettingsPage() {
  const settings = useLiveQuery(() => db.settings.get('team'), []) ?? DEFAULT_SETTINGS;

  return (
    <section>
      <h2>Team settings</h2>

      <div className="field">
        <label htmlFor="team-name">Team name</label>
        <input
          id="team-name"
          value={settings.teamName}
          onChange={(e) => saveSettings({ teamName: e.target.value })}
          placeholder="e.g. Under 11 Diamonds"
        />
      </div>

      <div className="field">
        <label htmlFor="quarter-minutes">Quarter length</label>
        <select
          id="quarter-minutes"
          value={settings.quarterMinutes}
          onChange={(e) => saveSettings({ quarterMinutes: Number(e.target.value) })}
        >
          {QUARTER_LENGTH_OPTIONS.map((minutes) => (
            <option key={minutes} value={minutes}>
              {minutes} minutes
            </option>
          ))}
        </select>
        <p className="hint">Total game time: {totalGameMinutes(settings.quarterMinutes)} minutes</p>
      </div>

      <p className="hint">Version {__APP_VERSION__}</p>
    </section>
  );
}
