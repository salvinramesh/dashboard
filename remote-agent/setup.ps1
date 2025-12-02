# ActionFi Remote Agent Setup Script

$ErrorActionPreference = "Stop"
$ScriptPath = $PSScriptRoot
$ExeName = "remote-agent-win.exe"
$ExePath = Join-Path $ScriptPath "dist\$ExeName"
$VbsName = "run-hidden.vbs"
$VbsPath = Join-Path $ScriptPath "dist\$VbsName"
$ShortcutName = "ActionFi Agent.lnk"
$StartupPath = "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup\$ShortcutName"

function Show-Menu {
    Clear-Host
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "   ActionFi Remote Agent Setup" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "1. Install as Startup App (Hidden/Background)"
    Write-Host "2. Uninstall (Remove from Startup)"
    Write-Host "3. Exit"
    Write-Host ""
}

function Install-Agent {
    if (-not (Test-Path $ExePath)) {
        Write-Host "Error: Could not find $ExePath" -ForegroundColor Red
        Write-Host "Please ensure you have built the executable or downloaded it to the 'dist' folder."
        return
    }

    Write-Host "Installing Agent..." -ForegroundColor Yellow

    # 1. Create VBScript wrapper for hidden execution
    # We must set the CurrentDirectory so the agent can find the .env file
    $VbsContent = "Set WshShell = CreateObject(""WScript.Shell"")`nWshShell.CurrentDirectory = ""$(Join-Path $ScriptPath 'dist')""`nWshShell.Run chr(34) & ""$ExePath"" & chr(34), 0`nSet WshShell = Nothing"
    Set-Content -Path $VbsPath -Value $VbsContent
    Write-Host "Created hidden launcher: $VbsPath"

    # 2. Create Startup Shortcut
    $WshShell = New-Object -ComObject WScript.Shell
    $Shortcut = $WshShell.CreateShortcut($StartupPath)
    $Shortcut.TargetPath = $VbsPath
    $Shortcut.WorkingDirectory = Join-Path $ScriptPath "dist"
    $Shortcut.Description = "ActionFi Remote Agent (Background)"
    $Shortcut.Save()

    Write-Host "Created startup shortcut: $StartupPath" -ForegroundColor Green
    Write-Host ""
    Write-Host "Success! The agent will now start automatically when you log in." -ForegroundColor Green
    Write-Host "To start it right now, you can double-click: $VbsPath" -ForegroundColor Gray
}

function Uninstall-Agent {
    Write-Host "Uninstalling Agent..." -ForegroundColor Yellow

    if (Test-Path $StartupPath) {
        Remove-Item $StartupPath -Force
        Write-Host "Removed startup shortcut." -ForegroundColor Green
    } else {
        Write-Host "Startup shortcut not found." -ForegroundColor Gray
    }

    if (Test-Path $VbsPath) {
        Remove-Item $VbsPath -Force
        Write-Host "Removed hidden launcher." -ForegroundColor Green
    }

    Write-Host "Uninstallation complete." -ForegroundColor Green
}

# Main Loop
do {
    Show-Menu
    $Choice = Read-Host "Enter your choice"
    switch ($Choice) {
        "1" { Install-Agent; Pause }
        "2" { Uninstall-Agent; Pause }
        "3" { exit }
        default { Write-Host "Invalid choice." -ForegroundColor Red; Start-Sleep -Seconds 1 }
    }
} while ($true)
