// Handles messaging between agents

const cookieParser = require('cookie-parser');
const { default: helmet } = require('helmet');
const { agentOnlySocket } = require('../auth/utils');
const agentDao = require('../db/dao/agent_dao');
const agentMessagesDao = require('../db/dao/agent_messages_dao');
const { server } = require('../server');

// eslint-disable-next-line import/order
const io = require('socket.io')(server, {
  path: '/api/start_messaging',
});

const usernameToSocketMap = {};

// Set secure default headers
io.engine.use(helmet());
// Parse cookies
io.engine.use(cookieParser());
// Ensure only agents can initialize the connection (not fully secure, but fine for v0)
io.use(agentOnlySocket);

io.on('connection', async (socket) => {
  // Add username to socket map
  usernameToSocketMap[socket.auth_token.username] = socket;

  socket.on('disconnect', () => {
    // Remove username from socket map
    delete usernameToSocketMap[socket.auth_token.username];
  });

  /**
     * Emits chats with array of all usernames the agent is currently chatting with.
     */
  socket.on('get-chats', async () => {
    try {
      const chattingWith = await agentDao.getChattingWithAgentUsernames(socket.auth_token.username);
      socket.emit('chats', chattingWith);
    } catch (err) {
      console.error(err);
      socket.disconnect();
    }
  });

  /**
     * Emits 'all-usernames' with a list of all agent usernames
     */
  socket.on('get-all-usernames', async () => {
    try {
      const allUsernames = await agentDao.getAllAgentUsernames();
      socket.emit('all-usernames', allUsernames);
    } catch (err) {
      console.error(err);
      socket.disconnect();
    }
  });

  socket.on('remove-chat', async (data) => {
    try {
      if (typeof data.username !== 'string') {
        return;
      }
    } catch (err) {
      return;
    }
    agentDao.removeUsernameFromChattingWithAgents(socket.auth_token.username, data.username);
  });

  socket.on('message', async (data) => {
    try {
      if (typeof data.message !== 'string' || typeof data.toUsername !== 'string') {
        return;
      }
    } catch (err) {
      return;
    }
    // Get timestamp before writing to db
    const ts = Date.now();
    // Message user if online
    if (Object.prototype.hasOwnProperty.call(usernameToSocketMap, data.toUsername)) {
      usernameToSocketMap[data.toUsername].emit('message', {
        from: socket.auth_token.username,
        message: data.message,
        timestamp: ts,
      });
    }
    // Write message to db
    agentMessagesDao.writeMessage(socket.auth_token.username, data.toUsername, data.message);
    // Add to chatting with if needed
    try {
      await agentDao.addUsernameToChattingWithAgents(socket.auth_token.username, data.toUsername);
    } catch (err) { console.error(err); }
    try {
      await agentDao.addUsernameToChattingWithAgents(data.toUsername, socket.auth_token.username);
    } catch (err) { console.error(err); }
  });
});
