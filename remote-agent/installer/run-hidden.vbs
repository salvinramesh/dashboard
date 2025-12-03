Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
WshShell.CurrentDirectory = scriptDir
WshShell.Run chr(34) & scriptDir & "\remote-agent-win.exe" & chr(34), 0
Set WshShell = Nothing
