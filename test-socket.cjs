const io = require('socket.io-client');

const socket = io('http://localhost:3006', {
    transports: ['websocket', 'polling'],
    reconnection: false
});

socket.on('connect', () => {
    console.log('Connected to server!');
    socket.disconnect();
});

socket.on('connect_error', (err) => {
    console.error('Connection error:', err.message);
});
