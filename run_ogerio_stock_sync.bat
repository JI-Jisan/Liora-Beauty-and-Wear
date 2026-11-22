@echo off
title Liora Beauty - Ogerio Live Stock Synchronizer
cd /d "%~dp0"
echo ========================================================
echo   LIORA BEAUTY - OGERIO LIVE STOCK AUTO SYNCHRONIZER
echo ========================================================
echo.
node client/scripts/crawl_and_sync_live_ogerio_stock.mjs
echo.
echo ========================================================
echo   SYNC FINISHED! DATABASE HAS BEEN UPDATED.
echo ========================================================
if "%1" neq "--scheduled" (
  pause
)

