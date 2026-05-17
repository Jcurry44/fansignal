@echo off
REM One-time setup. Double-click to enable automatic background refresh.
REM Creates a shortcut to watch-silent.vbs in your Windows Startup folder, so
REM the ingest watcher launches silently every time you log in and refreshes
REM FanSignal data every 10 minutes.

setlocal
set "SCRIPT_DIR=%~dp0"
set "TARGET=%SCRIPT_DIR%watch-silent.vbs"
set "STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "SHORTCUT=%STARTUP%\FanSignal Auto-Refresh.lnk"

echo Setting up FanSignal auto-refresh...
echo.
echo   Target:  %TARGET%
echo   Startup: %STARTUP%
echo.

if not exist "%TARGET%" (
  echo ERROR: watch-silent.vbs not found next to this script.
  pause
  exit /b 1
)

REM Build the shortcut using PowerShell (no third-party tools required).
powershell -NoProfile -Command ^
  "$ws = New-Object -ComObject WScript.Shell;" ^
  "$sc = $ws.CreateShortcut('%SHORTCUT%');" ^
  "$sc.TargetPath = 'wscript.exe';" ^
  "$sc.Arguments = '\"%TARGET%\"';" ^
  "$sc.WorkingDirectory = '%SCRIPT_DIR%';" ^
  "$sc.WindowStyle = 7;" ^
  "$sc.Description = 'FanSignal background data refresh';" ^
  "$sc.Save()"

if errorlevel 1 (
  echo.
  echo Setup failed. You can still refresh manually with refresh.bat.
  pause
  exit /b 1
)

echo.
echo Done. FanSignal will refresh in the background every time you log in.
echo.

REM Kick off the watcher right now so you don't have to log out and back in.
echo Starting watcher now (runs hidden — no window will appear)...
start "" wscript.exe "%TARGET%"

echo.
echo To disable later: double-click remove-autostart.bat
echo.
pause
