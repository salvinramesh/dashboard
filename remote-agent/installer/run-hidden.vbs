Set WshShell = CreateObject("WScript.Shell")
WScript.Sleep 30000 ' Wait 30 seconds for network to be ready
WshShell.CurrentDirectory = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
WshShell.Run chr(34) & "remote-agent-win.exe" & chr(34), 0
Set WshShell = Nothing
