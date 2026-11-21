@echo off
chcp 65001 >nul
title Tao tai khoan - Vo Lam Idle
set /p TEN=Ten tai khoan: 
set /p MK=Mat khau: 
node quan-tri.js them %TEN% %MK%
pause