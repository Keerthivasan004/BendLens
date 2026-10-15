; BendLens NSIS custom installer logic (referenced by package.json build.nsis.include).
;
; Solves:
;  1. 1.1.30 / OLD INSTALLER UPGRADE FAILURE — handles older uninstallers (v1.1.30) returning error code 1 via customUnInstallCheck without aborting.
;  2. STACK CORRUPTION — pops the exit code after every nsExec::Exec call.
;  3. INSTALLER SUICIDE — avoids /T on taskkill so parent/descendant installer processes are not terminated.
;  4. REINSTALL & UPDATE SAFETY — preserves $INSTDIR and user data during upgrades; clears stale caches and wipes legacy paths on clean uninstall.

!macro customInit
  ; Terminate any running BendLens processes and background server workers immediately on installer start
  nsExec::Exec 'taskkill /F /IM BendLens.exe'
  Pop $0
  nsExec::Exec 'taskkill /F /IM electron.exe'
  Pop $0
  Sleep 300
!macroend

!macro customCheckAppRunning
  ; Override electron-builder default check to prevent the "BendLens cannot be closed" prompt
  nsExec::Exec 'taskkill /F /IM BendLens.exe'
  Pop $0
  nsExec::Exec 'taskkill /F /IM electron.exe'
  Pop $0
  Sleep 300
!macroend

!macro customUnInstallCheck
  ; Critical fix for v1.1.30 upgrade: v1.1.30 uninstaller aborts with exit code 1 because its
  ; customUnInstall deleted $INSTDIR prematurely. customUnInstallCheck catches this non-zero result
  ; and clears errors so the new installer installs cleanly in-place without quitting.
  ClearErrors
!macroend

!macro customUnInstallCheckCurrentUser
  ClearErrors
!macroend

!macro customInstall
  ; Terminate any active BendLens processes before replacing files
  nsExec::Exec 'taskkill /F /IM BendLens.exe'
  Pop $0
  nsExec::Exec 'taskkill /F /IM electron.exe'
  Pop $0

  ; Remove legacy CMD-payload install dir left by older BendLens-Setup.cmd
  RMDir /r "$LOCALAPPDATA\BendLens"
  ; Remove legacy extracted-app cache from both old and new AppData locations
  RMDir /r "$APPDATA\BendLens\extracted-app"
  RMDir /r "$APPDATA\bendlens-platform\extracted-app"
  Delete "$APPDATA\BendLens\extracted-app.version"
  Delete "$APPDATA\bendlens-platform\extracted-app.version"
  ; Remove any stray temp scan folders
  RMDir /r "$TEMP\bendlens_temp_scans"
!macroend

!macro customUnInstall
  ; Kill any running BendLens processes before removing files
  nsExec::Exec 'taskkill /F /IM BendLens.exe'
  Pop $0
  nsExec::Exec 'taskkill /F /IM electron.exe'
  Pop $0

  ; IMPORTANT: Do NOT delete $INSTDIR here. Electron-builder's uninstaller.nsh manages
  ; $INSTDIR removal. Deleting it here breaks un.atomicRMDir during upgrades and aborts the installer.

  ; Only remove user data and shortcuts during a true uninstall, NEVER during an in-place upgrade
  ${ifNot} ${isUpdated}
    ; Remove user data
    RMDir /r "$APPDATA\BendLens"
    RMDir /r "$APPDATA\com.bendlens.studio"
    RMDir /r "$APPDATA\bendlens-platform"

    ; Remove legacy install locations
    RMDir /r "$LOCALAPPDATA\BendLens"
    RMDir /r "$LOCALAPPDATA\Programs\BendLens"
    RMDir /r "$PROGRAMFILES\BendLens"

    ; Remove shortcuts
    Delete "$DESKTOP\BendLens.lnk"
    Delete "$SMPROGRAMS\BendLens.lnk"

    ; Remove temp scan folders
    RMDir /r "$TEMP\bendlens_temp_scans"
  ${endif}
!macroend