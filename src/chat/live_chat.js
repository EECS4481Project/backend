// Chat between help_desk_user <-> anon using sockets

const cookieParser = require('cookie-parser');
const { default: helmet } = require('helmet');
const { populateAgentInSocket } = require('../auth/auth');
const { server } = require('../server');
const { handleAgentLogin, handleUserLogin, handleAgentDisconnect, handleUserDisconnect } = require('./queue_helper');
const { getSocketForAgent, getSocketForUser } = require('./socket_mapping');
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
    - Which contains {username: str, firstName: str, lastName: str}
- If the user is a normal user, they'll have a socket.user_info & socket.user_agent_info -- defined in queue_helper.handleUserLogin
    - socket.user_info contains {userId: str, firstName: str, lastName: str}
    - socket.user_agent_info contains {agentUsername: str}
    - Users require a 1-time use token created from the queue backend to join the chat
        This token contains the data required to populate socket.user_info & socket.users_agent_info.
- So, rather than trusting user data, you should always use the variables defined above

Socket mapping functionality:
- You can find the socket for any userId via get getSocketForUser(userId)
- You can find the socket for any agent username via getSocketForAgent(username)
- Note that the socket mapping is called upon handleAgentLogin() or handleUserLogin() being called in queue_helper
- Note that the socket mapping is removed upon handleAgentDisconnect() or handleUserDisconnect() being called in queue_helper
  - Reasoning for this happening in queue_helper, is that the queue relies on these values
*/
io.on('connection', async (socket) => {

    // Agent only endpoint
    if (socket.auth_token) {
        socket.on('agent-login', async (msg) => {
            // Notify queue of agent signing in & set socket mapping
            await handleAgentLogin(socket);
            socket.emit('started-agent-chat');
        })
    }

    // User only endpoint
    if (!socket.auth_token) {
        socket.on('user-login', async (msg) => {
            // Notify queue of user joining & set socket mapping
            await handleUserLogin(socket, msg);
            // Notify agent of user joining chat
            const agentSocket = getSocketForAgent(socket.user_agent_info.username);
            if (agentSocket != null) {
                agentSocket.emit('user_joined_chat', socket.user_info.userId);
            }
            // TODO: Set transcript if it exists -- We can use socket.user_info.userId to query data from anonymousUsers db
        })
    }

    socket.on('disconnect', async () => {
        if (socket.auth_token) {
            // Notify queue of agent disconnect & remove socket mapping
            await handleAgentDisconnect(socket);
        } else {
            // Notify agent of user disconnect
            const agentSocket = getSocketForAgent(socket.user_agent_info.username);
            if (agentSocket != null) {
                agentSocket.emit('user_disconnect', socket.user_info.userId);
            }
            // Notify queue that a spot is available & remove mapping
            await handleUserDisconnect(socket);
        }
    });

    socket.on('ping', () => {
        socket.emit('pong');
    })
});