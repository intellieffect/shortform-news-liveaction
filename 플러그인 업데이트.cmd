@echo off
rem Updates the shortform-news plugin for the Windows account that runs this file.
rem Claude Code plugins are installed per account, so each account runs it once after a repo update.
cd /d "%~dp0"
call claude plugin marketplace add ./ >nul 2>&1
call claude plugin marketplace update shortform-news-workflow
call claude plugin update shortform-news@shortform-news-workflow
if errorlevel 1 call claude plugin install shortform-news@shortform-news-workflow
call claude plugin list
node scripts/produce.mjs doctor --installed
pause
