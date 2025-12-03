const { execSync } = require('child_process');

try {
    // Use single quotes for hashtable keys to avoid shell issues
    const cmd = "Get-NetTCPConnection | Select-Object LocalAddress, LocalPort, RemoteAddress, RemotePort, @{Name='State';Expression={$_.State.ToString()}}, OwningProcess, @{Name='ProcessName';Expression={(Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue).ProcessName}} | ConvertTo-Json -Depth 1";

    // Use proper escaping for the command string if needed, but simple string usually works if inner quotes are single
    const output = execSync(`powershell -Command "${cmd}"`, { encoding: 'utf8' });

    console.log('Raw Output Length:', output.length);

    if (!output.trim()) {
        console.log('No output');
    } else {
        const connections = JSON.parse(output);
        const list = Array.isArray(connections) ? connections : [connections];
        console.log(JSON.stringify(list.slice(0, 5), null, 2));
    }

} catch (e) {
    console.error('Error:', e.message);
}
