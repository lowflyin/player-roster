import { useState } from 'react';
import { RosterPage } from './features/roster/RosterPage';
import { TeamPage } from './features/team/TeamPage';
import { MatchesPage } from './features/matches/MatchesPage';
import { SettingsPage } from './features/settings/SettingsPage';
import { ReloadPrompt } from './components/ReloadPrompt';

type Tab = 'roster' | 'team' | 'matches' | 'settings';

const TABS: { id: Tab; label: string }[] = [
  { id: 'roster', label: 'Roster' },
  { id: 'team', label: 'Team' },
  { id: 'matches', label: 'Matches' },
  { id: 'settings', label: 'Settings' },
];

export default function App() {
  const [tab, setTab] = useState<Tab>('roster');

  return (
    <div className="app">
      <header className="app-header">
        <h1>Netball Roster</h1>
      </header>

      <main className="app-main">
        {tab === 'roster' && <RosterPage />}
        {tab === 'team' && <TeamPage />}
        {tab === 'matches' && <MatchesPage />}
        {tab === 'settings' && <SettingsPage />}
      </main>

      <nav className="app-nav" aria-label="Main">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            aria-current={tab === id ? 'page' : undefined}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </nav>

      <ReloadPrompt />
    </div>
  );
}
