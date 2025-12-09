[Setup]
AppName=ActionFi Agent
AppVersion=v45
DefaultDirName=C:\ActionFi
DisableDirPage=no
DefaultGroupName=ActionFi
UninstallDisplayIcon={app}\remote-agent-win.exe
Compression=lzma2
SolidCompression=yes
OutputDir=C:\Users\salvin\Pictures\dashboard\remote-agent\dist
OutputBaseFilename=ActionFi-Setup-GUI-v45
PrivilegesRequired=admin

[Files]
Source: "..\dist\remote-agent-win.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "run-hidden.vbs"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\ActionFi Agent"; Filename: "{app}\remote-agent-win.exe"
Name: "{group}\Uninstall ActionFi Agent"; Filename: "{uninstallexe}"

[Run]
; 1. Create Scheduled Task (Directly via Schtasks)
; Runs 'wscript.exe "{app}\run-hidden.vbs"' at logon with highest privileges
Filename: "schtasks.exe"; Parameters: "/create /tn ""ActionFiAgent"" /tr ""wscript.exe \""{app}\run-hidden.vbs\"""" /sc onlogon /rl highest /f"; Flags: runhidden

; 2. Configure Firewall
Filename: "powershell.exe"; Parameters: "-Command ""New-NetFirewallRule -DisplayName 'ActionFi Agent' -Direction Inbound -LocalPort 3002 -Protocol TCP -Action Allow -ErrorAction SilentlyContinue"""; Flags: runhidden

; 3. Start Agent Immediately (via VBS)
Filename: "wscript.exe"; Parameters: """{app}\run-hidden.vbs"""; Flags: runhidden nowait

[UninstallRun]
; 1. Stop Agent
Filename: "taskkill.exe"; Parameters: "/F /IM remote-agent-win.exe"; Flags: runhidden; RunOnceId: "StopAgent"

; 2. Remove Scheduled Task
Filename: "schtasks.exe"; Parameters: "/delete /tn ""ActionFiAgent"" /f"; Flags: runhidden; RunOnceId: "RemoveTask"

; 3. Remove Registry Keys (via Agent --uninstall, legacy support)
Filename: "{app}\remote-agent-win.exe"; Parameters: "--uninstall"; Flags: runhidden; RunOnceId: "RemoveService"

[Code]
var
  DashboardUrlPage: TInputQueryWizardPage;
  AgentIdPage: TOutputMsgMemoWizardPage;
  AgentID: String;

procedure InitializeWizard;
begin
  // 1. Dashboard URL Page
  DashboardUrlPage := CreateInputQueryPage(wpWelcome,
    'Dashboard Configuration', 'Please enter the URL of your Dashboard Server.',
    'This allows the agent to connect to your central dashboard.');
  
  DashboardUrlPage.Add('Dashboard URL:', False);
  DashboardUrlPage.Values[0] := 'http://117.247.180.176:3006';

  // 2. Agent ID Display Page (shown after installation)
  AgentIdPage := CreateOutputMsgMemoPage(wpInstalling,
    'Installation Complete', 'Agent ID Generated',
    'The agent has been successfully installed. Please copy the Agent ID below if you need to register it manually:',
    '');
end;

function GetDashboardUrl(Param: String): String;
begin
  Result := DashboardUrlPage.Values[0];
end;

function GenerateAgentID: String;
begin
  // Generate a random ID: win-XXXXX-XXXXX
  Result := 'win-' + IntToStr(Random(90000) + 10000) + '-' + IntToStr(Random(90000) + 10000);
end;

procedure CurStepChanged(CurStep: TSetupStep);
var
  EnvContent: String;
  FileName: String;
begin
  if CurStep = ssPostInstall then
  begin
    // Generate ID and Content
    AgentID := GenerateAgentID;
    FileName := ExpandConstant('{app}\.env');
    
    EnvContent := 'AGENT_ID=' + AgentID + #13#10 +
                  'AGENT_NAME=Windows-' + GetComputerNameString + #13#10 +
                  'DASHBOARD_URL=' + DashboardUrlPage.Values[0] + #13#10 +
                  'JWT_SECRET=your-secret-key-change-in-production' + #13#10 +
                  'PORT=3002';
                  
    // Write .env file
    SaveStringToFile(FileName, EnvContent, False);
    
    // Update the ID page
    AgentIdPage.RichEditViewer.Lines.Add('AGENT_ID: ' + AgentID);
    AgentIdPage.RichEditViewer.Lines.Add('');
    AgentIdPage.RichEditViewer.Lines.Add('Status: Agent is running in the background.');
  end;
end;

function InitializeSetup(): Boolean;
var
  ResultCode: Integer;
begin
  // Stop the agent if it's running so we can overwrite the file
  Exec('taskkill.exe', '/F /IM remote-agent-win.exe', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
  Result := True;
end;
