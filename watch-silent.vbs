' watch-silent.vbs
' Runs the FanSignal watcher with no visible console window.
' Used by the Startup shortcut so autostart is silent in the background.

Set fso = CreateObject("Scripting.FileSystemObject")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)

Set shell = CreateObject("WScript.Shell")
shell.CurrentDirectory = scriptDir
' Window style 0 = hidden. Second arg False = don't wait for it to finish.
shell.Run "cmd /c node ingest.js --watch 10", 0, False
