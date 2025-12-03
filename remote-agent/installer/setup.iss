[Setup]
AppName=ActionFi Agent
AppVersion=2.0
DefaultDirName=C:\ActionFi
DisableDirPage=no
DefaultGroupName=ActionFi
UninstallDisplayIcon={app}\remote-agent-win.exe
Compression=lzma2
SolidCompression=yes
OutputDir=C:\Users\salvin\Pictures\dashboard\remote-agent\dist
OutputBaseFilename=ActionFi-Setup-GUI-v4
PrivilegesRequired=admin

[Files]
Source: "..\dist\remote-agent-win.exe"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\ActionFi Agent"; Filename: "{app}\remote-agent-win.exe"
Name: "{group}\Uninstall ActionFi Agent"; Filename: "{uninstallexe}"

[Run]
; 1. Generate Configuration (Hidden) - Uses the URL entered by the user
Filename: "cmd.exe"; Parameters: "/c echo AGENT_ID=win-%RANDOM%-%RANDOM% > ""{app}\.env"" & echo AGENT_NAME=Windows-%COMPUTERNAME% >> ""{app}\.env"" & echo DASHBOARD_URL={code:GetDashboardUrl} >> ""{app}\.env"" & echo JWT_SECRET=your-secret-key-change-in-production >> ""{app}\.env"" & echo PORT=3002 >> ""{app}\.env"""; Flags: runhidden

; 2. Install Service
Filename: "{app}\remote-agent-win.exe"; Parameters: "--install"; Flags: runhidden

; 3. Configure Firewall
Filename: "powershell.exe"; Parameters: "-Command ""New-NetFirewallRule -DisplayName 'ActionFi Agent' -Direction Inbound -LocalPort 3002 -Protocol TCP -Action Allow -ErrorAction SilentlyContinue"""; Flags: runhidden

; 4. Start Agent Immediately
Filename: "wscript.exe"; Parameters: """{app}\run-hidden.vbs"""; Flags: runhidden nowait

[UninstallRun]
; 1. Stop Agent
Filename: "taskkill.exe"; Parameters: "/F /IM remote-agent-win.exe"; Flags: runhidden; RunOnceId: "StopAgent"

; 2. Remove Service
Filename: "{app}\remote-agent-win.exe"; Parameters: "--uninstall"; Flags: runhidden; RunOnceId: "RemoveService"

[Code]
var
  DashboardUrlPage: TInputQueryWizardPage;

procedure InitializeWizard;
begin
  DashboardUrlPage := CreateInputQueryPage(wpWelcome,
    'Dashboard Configuration', 'Please enter the URL of your Dashboard Server.',
    'This allows the agent to connect to your central dashboard.');
  
  DashboardUrlPage.Add('Dashboard URL:', False);
  
  // Default value
  DashboardUrlPage.Values[0] := 'http://117.247.180.176:3006';
end;

function GetDashboardUrl(Param: String): String;
begin
  Result := DashboardUrlPage.Values[0];
end;

function InitializeSetup(): Boolean;
var
  ResultCode: Integer;
begin
  // Stop the agent if it's running so we can overwrite the file
  Exec('taskkill.exe', '/F /IM remote-agent-win.exe', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
  Result := True;
end;
