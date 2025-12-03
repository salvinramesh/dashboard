@echo off
setlocal
echo ==========================================
echo      ActionFi Agent Installer
echo ==========================================

:: Check for Admin privileges
net session >nul 2>&1
if %errorLevel% == 0 (
    echo [INFO] Running with Administrator privileges.
) else (
    echo [ERROR] This installer requires Administrator privileges.
    echo Please right-click and select "Run as Administrator".
    pause
    exit /b 1
)

set "INSTALL_DIR=C:\ActionFi"
set "EXE_NAME=remote-agent-win.exe"

echo [INFO] Creating installation directory: %INSTALL_DIR%
if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"

echo [INFO] Copying agent executable...
copy /Y "%EXE_NAME%" "%INSTALL_DIR%\%EXE_NAME%" >nul
if %errorLevel% neq 0 (
    echo [ERROR] Failed to copy executable.
    pause
    exit /b 1
)

echo [INFO] Generating configuration...
cd /d "%INSTALL_DIR%"

:: Generate unique ID
set "AGENT_ID=win-%RANDOM%-%RANDOM%"

(
echo AGENT_ID=%AGENT_ID%
echo AGENT_NAME=Windows-%COMPUTERNAME%
echo DASHBOARD_URL=http://117.247.180.176:3006
echo JWT_SECRET=your-secret-key-change-in-production
echo PORT=3002
) > .env

echo [INFO] Installing service...
"%EXE_NAME%" --install

echo [INFO] Configuring Firewall...
powershell -Command "New-NetFirewallRule -DisplayName 'ActionFi Agent' -Direction Inbound -LocalPort 3002 -Protocol TCP -Action Allow -ErrorAction SilentlyContinue"


echo.
echo [SUCCESS] Agent installed and started!
echo You can close this window.
timeout /t 5
