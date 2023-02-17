// Chat between help_desk_user <-> anon using sockets

const cookieParser = require('cookie-parser');
const { default: helmet } = require('helmet');
const { populateAgentInSocket } = require('../auth/auth');
const { server } = require('../server');
const { handleAgentLogin, handleUserLogin, handleAgentDisconnect, handleUserDisconnect } = require('./queue_helper');
const io = require("socket.io")(server, {
    path: "/api/start_chat"
});

// Set secure default headers
io.engine.use(helmet());
// Parse cookies
io.engine.use(cookieParser());
// Ensure only agents can initialize the connection (not fully secure, but fine for v0)
io.use(populateAgentInSocket);

/*
Queue related functionality:
- If a user disconnects, it frees a spot in the queue
- If an agent disconnects, it send the users an enqueue message with a 1-time use token & disconnects
    If that token is sent to join_queue, they will be pushed to the front of the queue.

Auth related functionality:
- If the user is an agent, they'll have a socket.auth_token
    Which contains {username: str, firstName: str, lastName: str}
- If the user is a normal user, they'll have a socket.user_info & socket.users_agent_info
    (defined in handleUserLogin())
    - Users require a 1-time use token created from the queue backend to join the chat
        This token contains the data required to populate socket.user_info & socket.users_agent_info.
*/
io.on('connection', async (socket) => {

    // Agent only endpoint
    if (socket.auth_token) {
        socket.on('agent-login', async (msg) => {
            // Notify queue of agent signing in
            handleAgentLogin(socket);
            socket.emit('started-agent-chat');
        })
    }

    // User only endpoint
    if (!socket.auth_token) {
        socket.on('user-login', async (msg) => {
            // Notify queue of user joining
            handleUserLogin(socket, msg);
            // TODO: Set transcript if it exists -- We can use socket.user_info.userId to query data from anonymousUsers db
        })
    }

    socket.on('disconnect', async () => {
        // Notify queue of disconnect
        if (socket.auth_token) {
            handleAgentDisconnect(socket);
        } else {
            handleUserDisconnect(socket);
        }
    });

    socket.on('ping', () => {
        socket.emit('pong');
    })
});