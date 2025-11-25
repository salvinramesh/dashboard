const si = require('systeminformation');

async function check() {
    try {
        const processes = await si.processes();
        console.log('Processes:', processes.list.slice(0, 3)); // First 3

        const users = await si.users();
        console.log('Users:', users);

        const connections = await si.networkConnections();
        console.log('Connections:', connections.slice(0, 3));

        const docker = await si.dockerContainers();
        console.log('Docker:', docker);

    } catch (e) {
        console.error(e);
    }
}

check();
