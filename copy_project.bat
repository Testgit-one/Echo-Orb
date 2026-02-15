@echo off
echo Creating backup in 'copy' folder...
mkdir copy 2>nul
:: Copy all files and folders, excluding the 'copy' folder itself and .git folder
robocopy . copy /E /XD copy .git
echo Backup complete.
pause