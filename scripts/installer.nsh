; BendLens NSIS custom installer logic (referenced by package.json build.nsis.include).
;
; Provides professional installer experience with:
;  - Components page: user chooses Desktop / Start Menu shortcuts
;  - Directory page: user chooses install location (default %LOCALAPPDATA%\Programs\BendLens)
;  - Clean upgrade: removes stale caches (legacy payload, extracted-app) before install
;  - Full uninstall: wipes app + %APPDATA%\BendLens, legacy dirs, temp history, shortcuts

!include "MUI2.nsh"
!include "FileFunc.nsh"
!include "LogicLib.nsh"
!include "WinCore.nsh"
!include "WinShell.nsh"

; --- MUI Pages ---
!define MUI_ICON "public/icon.ico"
!define MUI_UNICON "public/icon.ico"

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "LICENSE"
!insertmacro MUI_PAGE_COMPONENTS
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_WELCOME
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_UNPAGE_FINISH

!insertmacro MUI_LANGUAGE "English"

; --- Component IDs ---
!define COMP_DESKTOP_SHORTCUT 0
!define COMP_STARTMENU_SHORTCUT 1

; --- Custom Install Section ---
!macro customInstall
  ; Components are handled by MUI_PAGE_COMPONENTS; the section names
  ; below must match the component IDs above.

  Section "Desktop Shortcut" SecDesktopShortcut
    SectionIn ${COMP_DESKTOP_SHORTCUT}
    ; Shortcut creation is handled by electron-builder via createDesktopShortcut
  SectionEnd

  Section "Start Menu Shortcut" SecStartMenuShortcut
    SectionIn ${COMP_STARTMENU_SHORTCUT}
    ; Shortcut creation is handled by electron-builder via createStartMenuShortcut
  SectionEnd

  ; Pre-install cleanup (runs before files are copied)
  ; Remove legacy CMD-payload install dir left by older BendLens-Setup.cmd
  RMDir /r "$LOCALAPPDATA\BendLens"
  ; Drop the stale asar-extraction cache so the new version re-extracts cleanly
  RMDir /r "$APPDATA\BendLens\extracted-app"
  Delete "$APPDATA\BendLens\extracted-app.version"

  ; If an older version is already installed in the same directory,
  ; the file overwrite will handle it. But we also kill any running
  ; BendLens processes so files aren't locked.
  System::Call 'kernel32::GetCurrentProcessId()i.r0'
  ExecWait '"$SYSDIR\wbem\WMIC.exe" process where "name='\''BendLens.exe'\''" call terminate' $0
!macroend

; --- Custom Uninstall Section ---
!macro customUnInstall
  ; Electron userData (Cache, GPUCache, Code Cache, Local Storage, logs).
  ; deleteAppDataOnUninstall=true already removes $APPDATA\<productName>;
  ; these explicit lines also cover renamed/legacy variants.
  RMDir /r "$APPDATA\BendLens"
  RMDir /r "$APPDATA\com.bendlens.studio"
  ; Legacy payload dir from BendLens-Setup.cmd installs.
  RMDir /r "$LOCALAPPDATA\BendLens"
  ; Temp analysis-history file written by src/app/api/history/route.js
  Delete "$TEMP\.bendlens_history.json"
  ; Shortcuts (belt-and-braces alongside the builder-managed ones).
  Delete "$DESKTOP\BendLens.lnk"
  Delete "$SMPROGRAMS\BendLens.lnk"

  ; Kill any running BendLens processes before removing files
  ExecWait '"$SYSDIR\wbem\WMIC.exe" process where "name='\''BendLens.exe'\''" call terminate' $0
!macroend

; --- Component selection callbacks ---
Function .onInit
  ; Default both shortcut components ON
  ${SectionGetFlags} ${COMP_DESKTOP_SHORTCUT} $0
  IntOp $0 $0 | ${SF_SELECTED}
  ${SectionSetFlags} ${COMP_DESKTOP_SHORTCUT} $0

  ${SectionGetFlags} ${COMP_STARTMENU_SHORTCUT} $0
  IntOp $0 $0 | ${SF_SELECTED}
  ${SectionSetFlags} ${COMP_STARTMENU_SHORTCUT} $0
FunctionEnd

Function .onSelChange
  ; Update electron-builder shortcut creation flags based on component selection
  ; Note: electron-builder reads these at build time, not install time.
  ; For install-time control, we create/remove shortcuts manually here.
  ${SectionGetFlags} ${COMP_DESKTOP_SHORTCUT} $0
  IntOp $0 $0 & ${SF_SELECTED}
  StrCmp $0 ${SF_SELECTED} +2
  ; Desktop shortcut NOT selected - remove if exists
  Delete "$DESKTOP\BendLens.lnk"
  Goto +1
  ; Desktop shortcut selected - create it
  CreateShortcut "$DESKTOP\BendLens.lnk" "$INSTDIR\BendLens.exe" "" "$INSTDIR\public\icon.ico" 0

  ${SectionGetFlags} ${COMP_STARTMENU_SHORTCUT} $0
  IntOp $0 $0 & ${SF_SELECTED}
  StrCmp $0 ${SF_SELECTED} +2
  Delete "$SMPROGRAMS\BendLens.lnk"
  Goto +1
  CreateShortcut "$SMPROGRAMS\BendLens.lnk" "$INSTDIR\BendLens.exe" "" "$INSTDIR\public\icon.ico" 0
FunctionEnd