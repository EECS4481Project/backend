// Enqueues users & assigns them to an online help desk agent w/ availability
const { server } = require('../server');
const io = require("socket.io")(server, {
    path: "/api/start_queue"
});

io.on('connection', (socket) => {
    console.log('a user connected');
});