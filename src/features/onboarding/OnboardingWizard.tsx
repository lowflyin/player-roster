import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, saveSettings } from '../../db/db';
import { POSITIONS } from '../../domain/netball';
import { MatchForm } from '../matches/MatchForm';
import { PlayerEditor } from '../team/PlayerEditor';

const STEPS = ['Team Name', 'Players', 'First game'] as const;

interface Props {
  /** Called when set-up is finished (with the new game's id) or skipped. */
  onDone: (createdMatchId?: string) => void;
}

/** First-run set-up: team name, then players, then the first game. */
export function OnboardingWizard({ onDone }: Props) {
  const [step, setStep] = useState(0);
  const [teamName, setTeamName] = useState('');
  const playerCount = useLiveQuery(() => db.players.count(), []) ?? 0;
  const containerRef = useRef<HTMLDivElement>(null);

  // Move focus to each step's heading so screen readers announce the new step.
  useEffect(() => {
    const heading = containerRef.current?.querySelector('h2');
    heading?.setAttribute('tabindex', '-1');
    heading?.focus();
  }, [step]);

  async function finish(createdMatchId?: string) {
    await saveSettings(
      createdMatchId
        ? { onboardingDone: true, currentMatchId: createdMatchId }
        : { onboardingDone: true },
    );
    onDone(createdMatchId);
  }

  return (
    <div className="wizard" role="dialog" aria-modal="true" aria-labelledby="wizard-welcome">
      <div className="wizard-inner" ref={containerRef}>
        <div className="wizard-top">
          <p className="wizard-welcome" id="wizard-welcome">
            Welcome to Netball Roster
          </p>
          <button className="link-button" onClick={() => finish()}>
            Skip setup
          </button>
        </div>

        <ol className="wizard-progress" aria-hidden="true">
          {STEPS.map((label, i) => (
            <li key={label} className={i <= step ? 'done' : undefined} />
          ))}
        </ol>
        <p className="hint">
          Step {step + 1} of {STEPS.length}: {STEPS[step]}
        </p>

        {step === 0 && (
          <section>
            <h2>What’s your team called?</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setStep(1);
              }}
            >
              <div className="field">
                <label htmlFor="wizard-team-name">Team Name</label>
                <input
                  id="wizard-team-name"
                  value={teamName}
                  onChange={(e) => {
                    setTeamName(e.target.value);
                    void saveSettings({ teamName: e.target.value });
                  }}
                  placeholder="Enter Team Name"
                  autoComplete="off"
                />
                <p className="hint">
                  Shown at the top of the Roster tab. You can change it later in Settings.
                </p>
              </div>
              <div className="form-actions">
                <button type="submit">Next</button>
              </div>
            </form>
          </section>
        )}

        {step === 1 && (
          <section>
            <h2>Add your players</h2>
            <p className="hint wizard-intro">
              Add everyone in your squad. {POSITIONS.length} players fill the court; anyone extra
              shares the court time as a substitute. You can change players later on the Team tab.
            </p>
            <PlayerEditor />
            <p className="hint" aria-live="polite">
              {playerCount === 0
                ? 'Add at least one player to create a game.'
                : `${playerCount} ${playerCount === 1 ? 'player' : 'players'} added.`}
            </p>
            <div className="form-actions">
              <button className="secondary" onClick={() => setStep(0)}>
                Back
              </button>
              <button onClick={() => setStep(2)} disabled={playerCount === 0}>
                Next
              </button>
            </div>
          </section>
        )}

        {step === 2 && (
          <MatchForm
            title="Create your first game"
            cancelLabel="Back"
            onCancel={() => setStep(1)}
            onCreated={(id) => finish(id)}
          />
        )}
      </div>
    </div>
  );
}
