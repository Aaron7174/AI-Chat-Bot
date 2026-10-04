import { useEffect, useRef, useState } from 'react';

const isStandaloneApp = () => window.matchMedia('(display-mode: standalone)').matches
  || window.navigator.standalone === true;

const isAppleMobile = () => /iPad|iPhone|iPod/.test(window.navigator.userAgent)
  || (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);

function PwaControls() {
  const [online, setOnline] = useState(window.navigator.onLine);
  const [installed, setInstalled] = useState(isStandaloneApp);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showInstallInstructions, setShowInstallInstructions] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [dismissedUpdate, setDismissedUpdate] = useState(false);
  const [installError, setInstallError] = useState('');
  const registrationRef = useRef(null);

  useEffect(() => {
    const updateConnection = () => setOnline(window.navigator.onLine);
    const updateInstalledState = () => setInstalled(isStandaloneApp());
    const handleInstallPrompt = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    const handleInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
    };
    const standaloneMediaQuery = window.matchMedia('(display-mode: standalone)');

    window.addEventListener('online', updateConnection);
    window.addEventListener('offline', updateConnection);
    window.addEventListener('beforeinstallprompt', handleInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);
    if (standaloneMediaQuery.addEventListener) {
      standaloneMediaQuery.addEventListener('change', updateInstalledState);
    } else {
      standaloneMediaQuery.addListener(updateInstalledState);
    }

    return () => {
      window.removeEventListener('online', updateConnection);
      window.removeEventListener('offline', updateConnection);
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
      if (standaloneMediaQuery.removeEventListener) {
        standaloneMediaQuery.removeEventListener('change', updateInstalledState);
      } else {
        standaloneMediaQuery.removeListener(updateInstalledState);
      }
    };
  }, []);

  useEffect(() => {
    if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return undefined;

    let active = true;
    let registration;
    const handleUpdateFound = () => {
      const worker = registration.installing;
      if (!worker) return;

      worker.addEventListener('statechange', () => {
        if (active && worker.state === 'installed' && navigator.serviceWorker.controller) {
          setDismissedUpdate(false);
          setUpdateAvailable(true);
        }
      });
    };

    navigator.serviceWorker.register('/service-worker.js')
      .then((nextRegistration) => {
        if (!active) return;
        registration = nextRegistration;
        registrationRef.current = registration;
        registration.addEventListener('updatefound', handleUpdateFound);
        if (registration.waiting && navigator.serviceWorker.controller) setUpdateAvailable(true);
      })
      .catch((error) => {
        console.error('Employee AI could not register its offline app support.', error);
      });

    return () => {
      active = false;
      registration?.removeEventListener('updatefound', handleUpdateFound);
    };
  }, []);

  const installApp = async () => {
    if (!installPrompt) return;
    setInstallError('');

    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === 'accepted') setInstalled(true);
      setInstallPrompt(null);
    } catch (error) {
      console.error('Employee AI installation could not be started.', error);
      setInstallError('Installation could not be started. Try your browser menu instead.');
      setInstallPrompt(null);
    }
  };

  const applyUpdate = () => {
    const waitingWorker = registrationRef.current?.waiting;
    if (!waitingWorker) return;

    navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), { once: true });
    waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    setUpdateAvailable(false);
  };

  return (
    <div className="pwa-controls">
      <span className={`pwa-connection ${online ? 'online' : 'offline'}`} role="status" aria-label={online ? 'Browser is online' : 'Browser is offline'}>
        <i aria-hidden="true" />
        <span>{online ? 'Online' : 'Offline'}</span>
      </span>

      {installed ? (
        <span className="pwa-installed">App installed</span>
      ) : installPrompt ? (
        <button className="pwa-install-button" type="button" onClick={installApp}>Install app</button>
      ) : isAppleMobile() ? (
        <button className="pwa-install-button" type="button" onClick={() => setShowInstallInstructions(true)}>Install help</button>
      ) : null}

      {installError && <span className="pwa-install-error" role="alert">{installError}</span>}

      {updateAvailable && !dismissedUpdate && (
        <div className="pwa-update-notice" role="status">
          <span>A new version of Employee AI is ready.</span>
          <button type="button" onClick={applyUpdate}>Update</button>
          <button type="button" aria-label="Dismiss update notice" onClick={() => setDismissedUpdate(true)}>Later</button>
        </div>
      )}

      {showInstallInstructions && (
        <div className="pwa-dialog-backdrop" onClick={() => setShowInstallInstructions(false)}>
          <section
            className="pwa-install-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pwa-install-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button className="pwa-dialog-close" type="button" aria-label="Close installation instructions" onClick={() => setShowInstallInstructions(false)}>×</button>
            <h2 id="pwa-install-title">Add Employee AI to your Home Screen</h2>
            <p>In Safari, tap Share, then choose <strong>Add to Home Screen</strong>. Open Employee AI from its new Home Screen icon.</p>
            <button className="pwa-install-button" type="button" onClick={() => setShowInstallInstructions(false)}>Got it</button>
          </section>
        </div>
      )}
    </div>
  );
}

export default PwaControls;
