@echo off
echo ====================================
echo   Revenue Manager - Serveur local
echo ====================================
echo.
echo Ouverture sur : http://localhost:8080
echo Appuie sur Ctrl+C pour arreter.
echo.
start "" http://localhost:8080
python -m http.server 8080
pause
