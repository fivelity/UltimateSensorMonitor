@echo off
echo Creating desktop shortcut for Ultimate Sensor Monitor...

set "project_path=%~dp0"
set "shortcut_name=Ultimate Sensor Monitor.lnk"
set "desktop=%USERPROFILE%\Desktop"

REM Create shortcut using PowerShell
powershell -Command "& {$WshShell = New-Object -comObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%desktop%\%shortcut_name%'); $Shortcut.TargetPath = '%project_path%start_ultimon_full.bat'; $Shortcut.WorkingDirectory = '%project_path%'; $Shortcut.Description = 'Ultimate Sensor Monitor - Hardware Monitoring Dashboard'; $Shortcut.Save()}"

echo.
echo ✓ Desktop shortcut created: %shortcut_name%
echo.
echo You can now double-click the shortcut on your desktop to start
echo both the backend server and frontend client automatically!
echo.
pause 