import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { isFirstRun } from './db/db';
import { RosterPage } from './features/roster/RosterPage';
import { TeamPage } from './features/team/TeamPage';
import { MatchesPage } from './features/matches/MatchesPage';
import { SettingsPage } from './features/settings/SettingsPage';
import { OnboardingWizard } from './features/onboarding/OnboardingWizard';
import { ReloadPrompt } from './components/ReloadPrompt';

type Tab = 'roster' | 'team' | 'matches' | 'settings';

const TABS: { id: Tab; label: string }[] = [
  { id: 'roster', label: 'Roster' },
  { id: 'team', label: 'Team' },
  { id: 'matches', label: 'Games' },
  { id: 'settings', label: 'Settings' },
];

export default function App() {
  const [tab, setTab] = useState<Tab>('roster');
  const firstRun = useLiveQuery(() => isFirstRun(), []);
  // Decided once when the app opens; adding players during set-up must not close it.
  const [showSetup, setShowSetup] = useState<boolean | null>(null);
  if (showSetup === null && firstRun !== undefined) setShowSetup(firstRun);

  if (showSetup) {
    return (
      <>
        <OnboardingWizard
          onDone={() => {
            setShowSetup(false);
            setTab('roster');
          }}
        />
        <ReloadPrompt />
      </>
    );
  }

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
