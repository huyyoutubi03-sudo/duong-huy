@echo off
chcp 65001 >nul
title Chien - Vo Lam Xua - may chu
cd /d "%~dp0"
set "NODE=node"
if exist "%~dp0node\node.exe" set "NODE=%~dp0node\node.exe"
echo Chien - Vo Lam Xua
echo Giu cua so nay trong luc choi. Dong cua so = tat may chu.
echo Lan dau choi: tao tai khoan bang Tao_Tai_Khoan.bat (tai khoan dau tien la quan tri).
echo.
"%NODE%" chay-game.js 8101
pause
