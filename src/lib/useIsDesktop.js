'use client';

import { useState, useEffect } from 'react';

/**
 * True only inside the downloaded BendLens Desktop app (Electron), where
 * `electron/preload.js` exposes `window.bendlensDesktop = { isDesktop: true }`.
 * Web users always run the latest deployed build, so desktop-only surfaces
 * (update notifications, folder scans) must gate on this — never on hostname.
 */
export default function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    try {
      setIsDesktop(
        typeof window !== 'undefined' &&
        window.bendlensDesktop?.isDesktop === true
      );
    } catch {
      setIsDesktop(false);
    }
  }, []);

  return isDesktop;
}
