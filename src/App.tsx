import { useState } from 'react';
import { RosterPage } from './features/roster/RosterPage';
import { SettingsPage } from './features/settings/SettingsPage';
import { ReloadPrompt } from './components/ReloadPrompt';

type Tab = 'roster' | 'settings';

export default function App() {
  const [tab, setTab] = useState<Tab>('roster');

  return (
    <div className="app">
      <header className="app-header">
        <h1>Netball Roster</h1>
      </header>

      <main className="app-main">{tab === 'roster' ? <RosterPage /> : <SettingsPage />}</main>

      <nav className="app-nav" aria-label="Main">
        <button
          aria-current={tab === 'roster' ? 'page' : undefined}
          onClick={() => setTab('roster')}
        >
          Roster
        </button>
        <button
          aria-current={tab === 'settings' ? 'page' : undefined}
          onClick={() => setTab('settings')}
        >
          Settings
        </button>
      </nav>

      <ReloadPrompt />
    </div>
  );
}
