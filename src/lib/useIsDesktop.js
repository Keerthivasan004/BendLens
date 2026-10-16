'use client';

import { useState, useEffect } from 'react';

/**
 * Universal detection of whether the user is in a downloaded / local desktop environment.
 * Evaluates to true for:
 * 1. Native Electron Desktop App (window.bendlensDesktop bridge, Electron userAgent, or window.process.versions.electron)
 * 2. WebView2 Windows Desktop App (window.chrome.webview or window.bendlensDesktop)
 * 3. Downloaded Local Machine Runtime (localhost, 127.0.0.1, [::1], *.local)
 * 
 * Web visitors accessing a remote cloud deployment (e.g. *.vercel.app, bendlens.com) evaluate to false,
 * ensuring they see the "Download Desktop App" action.
 */
export function checkIsDesktop() {
  if (typeof window === 'undefined') return false;
  try {
    // 1. Explicit desktop bridge injected by Electron / WebView2
    if (window.bendlensDesktop?.isDesktop === true) return true;

    // 2. Electron or BendLens User-Agent detection
    const ua = window.navigator?.userAgent || '';
    if (/Electron|BendLens/i.test(ua)) return true;

    // 3. Electron process versions in renderer
    if (window.process?.versions?.electron) return true;

    // 4. Microsoft Edge WebView2 runtime object
    if (window.chrome?.webview) return true;

    // 5. File protocol runtime (packaged / offline)
    if (window.location?.protocol === 'file:') return true;

    // 6. Downloaded local machine server runtime
    // Only downloaded users run the engine locally on localhost / 127.0.0.1 / ::1 / local network
    const hostname = window.location?.hostname || '';
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname === '[::1]' ||
      hostname.endsWith('.local') ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)
    ) {
      return true;
    }

    // 7. Persisted desktop download token in localStorage
    if (typeof localStorage !== 'undefined' && localStorage.getItem('bendlens-desktop-downloaded') === 'true') {
      if (hostname === 'localhost' || hostname === '127.0.0.1' || !hostname.includes('.')) {
        return true;
      }
    }
  } catch {}
  return false;
}

export default function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window !== 'undefined') {
      return checkIsDesktop();
    }
    return false;
  });

  useEffect(() => {
    const detect = () => {
      const desktop = checkIsDesktop();
      setIsDesktop(desktop);
      return desktop;
    };

    // Immediate check
    if (detect()) return;

    // Polling retry in case Electron preload or WebView2 bridge initializes slightly after hydration
    const timer = setTimeout(detect, 100);
    const interval = setInterval(() => {
      if (detect()) {
        clearInterval(interval);
      }
    }, 500);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  return isDesktop;
}

