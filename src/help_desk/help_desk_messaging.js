// Handles messaging between agents

const cookieParser = require('cookie-parser');
const { default: helmet } = require('helmet');
const fileTypeFromBuffer = require('file-type').fromBuffer;
const { agentOnlySocket } = require('../auth/utils');
const agentDao = require('../db/dao/agent_dao');
const { storeAgentFile } = require('../db/dao/agent_files_dao');
const agentMessagesDao = require('../db/dao/agent_messages_dao');
const { server } = require('../server');
const { validateFileType } = require('../utils');

// eslint-disable-next-line import/order
const io = require('socket.io')(server, {
  path: '/api/start_messaging',
  maxHttpBufferSize: 3e6, // Max 3 mb
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

  socket.on('file-upload', async (data) => {
    // Return if invalid input
    if (!Buffer.isBuffer(data.file) || typeof data.name !== 'string' || typeof data.toUsername !== 'string') {
      return;
    }
    const fileType = await fileTypeFromBuffer(data.file);
    // Return if file type isn't allowed
    if (!validateFileType(fileType.mime)) {
      return;
    }
    // Convert file to b64
    const base64File = data.file.toString('base64');
    // Get timestamp before writing to db
    const ts = Date.now();
    // Upload file
    let fileId = '';
    try {
      fileId = await storeAgentFile(
        base64File,
        data.name,
        fileType.mime,
        socket.auth_token.username,
        data.toUsername,
      );
    } catch (err) {
      console.log(err);
      // Notify of upload failure
      socket.emit('upload-failure', { fileName: data.name });
      return;
    }

    // Message user if online
    if (Object.prototype.hasOwnProperty.call(usernameToSocketMap, data.toUsername)) {
      usernameToSocketMap[data.toUsername].emit('message', {
        from: socket.auth_token.username,
        message: data.name,
        timestamp: ts,
        fileId,
      });
    }
    // Message sender the file id
    socket.emit('message', {
      from: socket.auth_token.username,
      message: data.name,
      timestamp: ts,
      fileId,
      isSelfMessageTo: data.toUsername,
    });
    // Write message to db
    try {
      agentMessagesDao.writeFileMessage(
        socket.auth_token.username,
        data.toUsername,
        fileId,
        data.name,
      );
    } catch (err) {
      console.error(err);
    }
    // Add to chatting with if needed
    try {
      await agentDao.addUsernameToChattingWithAgents(socket.auth_token.username, data.toUsername);
    } catch (err) { console.error(err); }
    try {
      await agentDao.addUsernameToChattingWithAgents(data.toUsername, socket.auth_token.username);
    } catch (err) { console.error(err); }
  });
});
