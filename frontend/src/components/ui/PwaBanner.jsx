import React, { useEffect, useState } from 'react';
import { Download, RefreshCw, Share, X } from 'lucide-react';
import Button from './Button';
import {
  subscribePwaState,
  triggerInstallPrompt,
  dismissInstallPrompt,
  applyPwaUpdate,
} from '../../utils/pwaManager';

/**
 * Subtle 2D Pixel Glass PWA prompt for app updates and home-screen installation.
 */
export default function PwaBanner({ hideInstall = false }) {
  const [pwa, setPwa] = useState({
    canPromptInstall: false,
    showIosHint: false,
    updateAvailable: false,
  });
  const [updateDismissed, setUpdateDismissed] = useState(false);

  useEffect(() => subscribePwaState(setPwa), []);

  if (pwa.updateAvailable && !updateDismissed) {
    return (
      <div className="pwa-banner" role="status" aria-live="polite">
        <div className="pwa-banner__content">
          <RefreshCw size={16} strokeWidth={2.2} aria-hidden="true" className="pwa-banner__icon" />
          <div className="pwa-banner__text">
            <strong>Update available</strong>
            <span>Refresh to load the latest EVidya offline bundle.</span>
          </div>
        </div>
        <div className="pwa-banner__actions">
          <Button variant="primary" size="sm" onClick={applyPwaUpdate}>
            Update
          </Button>
          <button
            type="button"
            className="pwa-banner__close"
            aria-label="Dismiss update notice"
            onClick={() => setUpdateDismissed(true)}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      </div>
    );
  }

  if (hideInstall) return null;

  if (pwa.canPromptInstall) {
    return (
      <div className="pwa-banner" role="region" aria-label="Install EVidya App">
        <div className="pwa-banner__content">
          <Download size={16} strokeWidth={2.2} aria-hidden="true" className="pwa-banner__icon" />
          <div className="pwa-banner__text">
            <strong>Install EVidya App</strong>
            <span>Launch from your home screen with offline notes.</span>
          </div>
        </div>
        <div className="pwa-banner__actions">
          <Button variant="kraft" size="sm" onClick={triggerInstallPrompt}>
            Install
          </Button>
          <button
            type="button"
            className="pwa-banner__close"
            aria-label="Dismiss install prompt"
            onClick={dismissInstallPrompt}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      </div>
    );
  }

  if (pwa.showIosHint) {
    return (
      <div className="pwa-banner" role="region" aria-label="Add EVidya to Home Screen on iOS">
        <div className="pwa-banner__content">
          <Share size={16} strokeWidth={2.2} aria-hidden="true" className="pwa-banner__icon" />
          <div className="pwa-banner__text">
            <strong>Add EVidya to Home Screen</strong>
            <span>Tap Share in Safari, then choose &ldquo;Add to Home Screen&rdquo;.</span>
          </div>
        </div>
        <div className="pwa-banner__actions">
          <Button variant="note" size="sm" onClick={dismissInstallPrompt}>
            Got it
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
