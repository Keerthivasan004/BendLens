; BendLens NSIS custom installer logic (referenced by package.json build.nsis.include).
;
; Solves two reported problems for downloaded users:
;  1. REINSTALL BROKEN — a re-downloaded install used to start against stale
;     leftovers (legacy %LOCALAPPDATA%\BendLens payload from the old
;     BendLens-Setup.cmd flow, or a stale %APPDATA%\BendLens\extracted-app
;     from the app.asar fallback in electron/main.js). The fresh engine then
;     loaded mismatched files and "did not work properly".
;     customInstall removes those stale leftovers so every reinstall boots
;     clean. The running-app case is handled by Electron's single-instance
;     lock (second launch just focuses the existing window).
;  2. UNINSTALL LEAVES DATA — with deleteAppDataOnUninstall=true plus the
;     explicit removals below, uninstalling/deleting the app also wipes the
;     Electron userData dir (%APPDATA%\BendLens: Cache, GPUCache,
;     extracted-app, Local Storage), the legacy payload dir, the temp
;     analysis-history file, and all shortcuts.

!macro customInstall
  ; Remove legacy CMD-payload install dir left by older BendLens-Setup.cmd
  ; installs. The NSIS per-user $INSTDIR is "$LOCALAPPDATA\Programs\BendLens",
  ; so this never deletes the files being installed right now.
  RMDir /r "$LOCALAPPDATA\BendLens"
  ; Drop the stale asar-extraction cache so the new version re-extracts
  ; (electron/main.js also version-guards this at runtime as a second net).
  RMDir /r "$APPDATA\BendLens\extracted-app"
  Delete "$APPDATA\BendLens\extracted-app.version"
!macroend

!macro customUnInstall
  ; Electron userData (Cache, GPUCache, Code Cache, Local Storage, logs).
  ; deleteAppDataOnUninstall=true already removes $APPDATA\<productName>;
  ; these explicit lines also cover renamed/legacy variants.
  RMDir /r "$APPDATA\BendLens"
  RMDir /r "$APPDATA\com.bendlens.studio"
  ; Legacy payload dir from BendLens-Setup.cmd installs.
  RMDir /r "$LOCALAPPDATA\BendLens"
  ; Temp analysis-history file written by src/app/api/history/route.js
  ; (HISTORY_FILE = os.tmpdir() + '\.bendlens_history.json').
  Delete "$TEMP\.bendlens_history.json"
  ; Shortcuts (belt-and-braces alongside the builder-managed ones).
  Delete "$DESKTOP\BendLens.lnk"
  Delete "$SMPROGRAMS\BendLens.lnk"
!macroend
