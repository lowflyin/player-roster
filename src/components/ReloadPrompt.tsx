import { useRegisterSW } from 'virtual:pwa-register/react';

/**
 * Shows a banner when a new version has been deployed, so the coach can
 * choose when to reload (never mid-game). Also confirms when offline use is ready.
 */
export function ReloadPrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!offlineReady && !needRefresh) return null;

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  return (
    <div className="toast" role="status">
      <span>{needRefresh ? 'A new version is available.' : 'Ready to work offline.'}</span>
      {needRefresh && <button onClick={() => updateServiceWorker(true)}>Update</button>}
      <button className="secondary" onClick={close}>
        Close
      </button>
    </div>
  );
}
