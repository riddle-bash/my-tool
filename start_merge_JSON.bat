@echo off
rem Check if Deno is installed
deno --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Deno is not installed. Please install Deno from https://deno.land/.
    exit /b 1
)

rem Run the Deno script with necessary permissions
deno run --allow-net --allow-read --allow-write mergeJSON.js

rem Pause the script to see the output
pause