@echo off
REM Double-click to disable FanSignal background auto-refresh.
REM Deletes the Startup shortcut and stops any running watch-silent.vbs process.

setlocal
set "SHORTCUT=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\FanSignal Auto-Refresh.lnk"

echo Removing FanSignal auto-refresh...
echo.

if exist "%SHORTCUT%" (
  del "%SHORTCUT%"
  echo   Removed startup shortcut.
) else (
  echo   No startup shortcut found.
)

REM Stop any running wscript.exe instances tied to watch-silent.vbs.
REM We can't filter by script name with taskkill alone, so we use WMIC.
powershell -NoProfile -Command ^
  "Get-CimInstance Win32_Process -Filter \"Name = 'wscript.exe'\" |" ^
  "  Where-Object { $_.CommandLine -like '*watch-silent.vbs*' } |" ^
  "  ForEach-Object { Stop-Process -Id $_.ProcessId -Force; Write-Host '  Stopped running watcher (PID' $_.ProcessId').' }"

echo.
echo Done. Background refresh is disabled.
echo Manual refresh (refresh.bat) still works.
echo.
pause
