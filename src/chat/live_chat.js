// Websockets
// Chat between help_desk_user <-> anon
// Should also show recipient name & sender name for each message

// End chat functionality for both agent & user -- clears up a spot in agents queue

// NOTE: Some boiler plate for knowing if a request is from an agent or user.

const cookieParser = require('cookie-parser');
const { default: helmet } = require('helmet');
const { populateAgentInSocket } = require('../auth/auth');
const { server } = require('../server');
const io = require("socket.io")(server, {
    path: "/api/start_chat"
});

// Set secure default headers
io.engine.use(helmet());
// Parse cookies
io.engine.use(cookieParser());
// Ensure only agents can initialize the connection (not fully secure, but fine for v0)
io.use(populateAgentInSocket);

io.on('connection', async (socket) => {
    // If the socket was initialized by an agent:
    // socket.auth_token will give us the info for the current agent
    // Otherwise, socket.auth_token will be null

    // So any agent-only functionality should be wrapped in:
    // if (agent) { ... }
    if (socket.auth_token) {
        console.log(socket.auth_token.username, socket.auth_token.firstName);
    } else {
        console.log("not an agent -- must be a user")
    }
    socket.on('disconnect', () => {
        console.log('user disconnected', socket.id);
    });

    socket.on('ping', () => {
        socket.emit('pong');
    })

    if (socket.auth_token) {
        socket.on('agent-ping', () => {
            socket.emit('agent-pong');
        })
    }
});