@echo off
REM Double-click to pull fresh Buffalo sports news. Then refresh your browser tab.
cd /d "%~dp0"
echo Refreshing FanSignal data...
echo.
node ingest.js
echo.
echo Done. Refresh your browser tab to see the new data.
echo (This window will close in 5 seconds.)
timeout /t 5 /nobreak >nul
