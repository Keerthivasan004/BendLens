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

; --- MUI Pages (MUI_ICON/MUI_UNICON already defined by electron-builder config) ---
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "${PROJECT_DIR}\LICENSE"
!insertmacro MUI_PAGE_COMPONENTS
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_WELCOME
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_UNPAGE_FINISH

; --- Component IDs ---
!define COMP_DESKTOP_SHORTCUT 0
!define COMP_STARTMENU_SHORTCUT 1

; --- Custom Install Section ---
!macro customInstall
  ; Components are handled by MUI_PAGE_COMPONENTS; the section names
  ; below must match the component IDs above.

  Section "Desktop Shortcut" SecDesktopShortcut
    SectionIn 1 2
    ; Shortcut created in .onSelChange based on component state
  SectionEnd

  Section "Start Menu Shortcut" SecStartMenuShortcut
    SectionIn 1 2
    ; Shortcut created in .onSelChange based on component state
  SectionEnd

  ; Clean up legacy installs before installing fresh
  ; Remove legacy %LOCALAPPDATA%\BendLens folder
  RMDir /r "$LOCALAPPDATA\BendLens"
  ; Remove legacy extracted-app cache
  RMDir /r "$APPDATA\BendLens\extracted-app"
  ; Remove any stray temp scan folders
  RMDir /r "$TEMP\bendlens_temp_scans"
!macroend

; --- Custom Uninstall Section ---
!macro customUnInstall
  ; Kill any running BendLens processes before removing files
  ExecWait '"$SYSDIR\wbem\WMIC.exe" process where "name='\''BendLens.exe'\''" call terminate' $0

  ; Remove installed files
  RMDir /r "$INSTDIR"

  ; Remove user data
  RMDir /r "$APPDATA\BendLens"

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

; --- Component selection callbacks (simplified for NSIS 3.0.4 compatibility) ---
; Use basic SectionGetFlags/SectionSetFlags via !insertmacro if available, else skip
Function .onInit
  ; Default both shortcut components ON
  StrCpy $0 ${SF_SELECTED}
  SectionSetFlags ${COMP_DESKTOP_SHORTCUT} $0
  SectionSetFlags ${COMP_STARTMENU_SHORTCUT} $0
FunctionEnd

Function .onSelChange
  ; Check desktop shortcut component
  SectionGetFlags ${COMP_DESKTOP_SHORTCUT} $0
  ${If} $0 & ${SF_SELECTED}
    CreateShortcut "$DESKTOP\BendLens.lnk" "$INSTDIR\BendLens.exe" "" "$INSTDIR\public\icon.ico" 0
  ${Else}
    Delete "$DESKTOP\BendLens.lnk"
  ${EndIf}

  ; Check start menu shortcut component
  SectionGetFlags ${COMP_STARTMENU_SHORTCUT} $0
  ${If} $0 & ${SF_SELECTED}
    CreateShortcut "$SMPROGRAMS\BendLens.lnk" "$INSTDIR\BendLens.exe" "" "$INSTDIR\public\icon.ico" 0
  ${Else}
    Delete "$SMPROGRAMS\BendLens.lnk"
  ${EndIf}
FunctionEnd