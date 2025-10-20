@echo off
cd /d "%~dp0"
echo Current directory: %CD%
echo.
echo === Git Status ===
git status --porcelain
echo.
echo === Adding changes ===
git add .
echo.
echo === Committing changes ===
git commit -m "docs: clean up deployment-fixes tasks formatting"
echo.
echo === Pushing to remote ===
git push
echo.
echo Done!
pause