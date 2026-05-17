@echo off
REM Double-click to start the background watcher.
REM This window stays open and re-ingests every 10 minutes until you close it.
REM Just hit F5 in your browser whenever you want to see the latest pull.
cd /d "%~dp0"
echo Starting FanSignal watcher (refreshes every 10 minutes).
echo Close this window to stop.
echo.
node ingest.js --watch 10
pause
