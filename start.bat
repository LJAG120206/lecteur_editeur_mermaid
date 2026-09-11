@echo off
setlocal
cd /d "%~dp0"
set PORT=47823

echo.
echo  Editeur Mermaid local
echo  http://localhost:%PORT%
echo  Ctrl+C pour arreter le serveur
echo.

start "" cmd /c "timeout /t 1 /nobreak >nul & start http://localhost:%PORT%"

where python >nul 2>&1
if %ERRORLEVEL%==0 (
  python -m http.server %PORT%
  goto :eof
)

where py >nul 2>&1
if %ERRORLEVEL%==0 (
  py -m http.server %PORT%
  goto :eof
)

echo Python est introuvable. Installez Python puis relancez start.bat
echo https://www.python.org/downloads/
pause
