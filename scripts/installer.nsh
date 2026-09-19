; BendLens NSIS custom installer logic (referenced by package.json build.nsis.include).
;
; Solves two reported problems for downloaded users:
;  1. REINSTALL BROKEN — removes stale leftovers so every reinstall boots clean.
;  2. UNINSTALL LEAVES DATA — cleans user data, legacy payload, temp files, and shortcuts.

!macro customInstall
  ; Remove legacy CMD-payload install dir left by older BendLens-Setup.cmd
  RMDir /r "$LOCALAPPDATA\BendLens"
  ; Remove legacy extracted-app cache
  RMDir /r "$APPDATA\BendLens\extracted-app"
  Delete "$APPDATA\BendLens\extracted-app.version"
  ; Remove any stray temp scan folders
  RMDir /r "$TEMP\bendlens_temp_scans"
!macroend

!macro customUnInstall
  ; Kill any running BendLens processes before removing files
  ExecWait '"$SYSDIR\wbem\WMIC.exe" process where "name='\''BendLens.exe'\''" call terminate' $0

  ; Remove installed files
  RMDir /r "$INSTDIR"

  ; Remove user data
  RMDir /r "$APPDATA\BendLens"
  RMDir /r "$APPDATA\com.bendlens.studio"

  ; Remove legacy install locations
  RMDir /r "$LOCALAPPDATA\BendLens"
  RMDir /r "$LOCALAPPDATA\Programs\BendLens"
  RMDir /r "$PROGRAMFILES\BendLens"

  ; Remove shortcuts
  Delete "$DESKTOP\BendLens.lnk"
  Delete "$SMPROGRAMS\BendLens.lnk"

  ; Remove temp scan folders
  RMDir /r "$TEMP\bendlens_temp_scans"
!macroend