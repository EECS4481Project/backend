// Chat between help_desk_user <-> anon using sockets
const cookieParser = require('cookie-parser');
const { default: helmet } = require('helmet');
const fileTypeFromBuffer = require('file-type').fromBuffer;
const { getMessagesByUserId, addMessageToUser, addFileToUser } = require('../db/dao/anonymous_user_dao');
const {
  handleAgentLogin, handleUserLogin, handleAgentDisconnect,
  handleUserDisconnect, isUserIdAssignedToAgent, removeAssignedUserId,
  transferUser,
} = require('./queue_helper');
const { getSocketForAgent, getSocketForUser } = require('./socket_mapping');
const { populateAgentInSocket } = require('../auth/utils');
const { server } = require('../server');
const { writeFile } = require('../db/dao/user_files_dao');

// eslint-disable-next-line import/order
const io = require('socket.io')(server, {
  path: '/api/start_chat',
  maxHttpBufferSize: 2e6, // Max 2 mb
});

const allowedFileTypes = [
  'image',
  'video',
  'application/pdf',
];

// Set secure default headers
io.engine.use(helmet());
// Parse cookies
io.engine.use(cookieParser());
// Ensure only agents can initialize the connection (not fully secure, but fine for v0)
io.use(populateAgentInSocket);

const onlineAgents = new Set();

/**
// Returns true if the given mimetype is allowed, false otherwise
 * @param {string} mime file mimetype
 * @returns true if allowed, false otherwise.
 */
const validateFileType = (mime) => {
  for (let i = 0; i < allowedFileTypes.length; i++) {
    if (mime.startsWith(allowedFileTypes[i]) || mime === allowedFileTypes[i]) {
      return true;
    }
  }
  return false;
};

/*
Queue related functionality:
- If a user disconnects, it frees a spot in the queue
- If an agent disconnects, it send the users an enqueue message with a 1-time
use token & disconnects
    If that token is sent to join_queue, they will be pushed to the front of the queue.

Auth related functionality:
- If the user is an agent, they'll have a socket.auth_token
    - Which contains {username: str, firstName: str, lastName: str}
- If the user is a normal user, they'll have a socket.user_info &
socket.user_agent_info -- defined in queue_helper.handleUserLogin
    - socket.user_info contains {userId: str, firstName: str, lastName: str}
    - socket.user_agent_info contains {agentUsername: str}
    - Users require a 1-time use token created from the queue backend to join the chat
        This token contains the data required to populate socket.user_info &
        socket.users_agent_info.
- So, rather than trusting user data, you should always use the variables defined above

Socket mapping functionality:
- You can find the socket for any userId via get getSocketForUser(userId)
- You can find the socket for any agent username via getSocketForAgent(username)
- Note that the socket mapping is called upon handleAgentLogin() or
handleUserLogin() being called in queue_helper
- Note that the socket mapping is removed upon handleAgentDisconnect() or
handleUserDisconnect() being called in queue_helper
  - Reasoning for this happening in queue_helper, is that the queue relies on these values
*/
io.on('connection', async (socket) => {
  // Agent only endpoint
  if (socket.auth_token) {
    socket.on('agent-login', async () => {
      // Notify queue of agent signing in & set socket mapping
      await handleAgentLogin(socket);
      onlineAgents.add(socket.auth_token.username);
      socket.join('agents');
      socket.emit('started-agent-chat');
      // Notify agents that agent is offline (for transferring)
      io.to('agents').emit('available_agents', [...onlineAgents]);
    });
  }

  // User only endpoint
  if (!socket.auth_token) {
    socket.on('user-login', async (msg) => {
      // Notify queue of user joining & set socket mapping
      await handleUserLogin(socket, msg);
      // Notify agent of user joining chat
      let agentSocket = getSocketForAgent(socket.user_agent_info.username);
      if (agentSocket != null) {
        agentSocket.emit('user_joined_chat', socket.user_info.userId);
      }
      try {
        // Send transcript to user & agent
        const transcript = await getMessagesByUserId(socket.user_info.userId);
        socket.emit('transcript', transcript);
        agentSocket = getSocketForAgent(socket.user_agent_info.username);
        if (agentSocket != null) {
          agentSocket.emit('transcript', {
            userId: socket.user_info.userId,
            transcript,
          });
        }
      } catch (err) {
        // Something went wrong
        socket.disconnect();
      }
    });
  }

  if (socket.auth_token) {
    socket.on('transfer', async (data) => {
      if (typeof data.userId !== 'string' || typeof data.toUsername !== 'string' || !onlineAgents.has(data.toUsername)) {
        return;
      }
      // Only transfer user if both online
      const userSocket = getSocketForUser(data.userId);
      const newAgentSocket = getSocketForAgent(data.toUsername);
      if (userSocket && newAgentSocket) {
        // Notify agent of removal
        socket.emit('user_disconnect', data.userId);
        // Handle queue
        await transferUser(data.userId, socket.auth_token.username, data.toUsername);
        // Update users socket
        userSocket.user_agent_info.username = data.toUsername;
        // Alert user of change
        userSocket.emit('agent-changed', data.toUsername);
        // Notify new agent that user has been assigned
        newAgentSocket.emit('assigned_user', {
          userId: data.userId,
          firstName: userSocket.user_info.firstName,
          lastName: userSocket.user_info.lastName,
        });
        // Send transcript to new agent
        const transcript = await getMessagesByUserId(data.userId);
        newAgentSocket.emit('transcript', {
          userId: data.userId,
          transcript,
        });
      } else if (userSocket) {
        // Disconnect user as something went wrong
        userSocket.disconnect();
      }
    });
  }

  socket.on('message', async (data) => {
    if (typeof data.message !== 'string') {
      return;
    }
    if (socket.auth_token) {
      if (typeof data.userId !== 'string') {
        return;
      }
      // Only allow agent to message assigned users
      if (!isUserIdAssignedToAgent(data.userId, socket.auth_token.username)) {
        return;
      }
      // Agent case
      const userSocket = getSocketForUser(data.userId);
      if (userSocket) {
        // Notify user
        userSocket.emit('message', {
          message: data.message,
          timestamp: Date.now(),
          correspondentUsername: socket.auth_token.username,
          isFromUser: false,
        });
      }
      // Write message to db for transcript
      addMessageToUser(data.userId, data.message, socket.auth_token.username, false);
    } else {
      // User case
      const agentSocket = getSocketForAgent(socket.user_agent_info.username);
      if (agentSocket) {
        // Notify agent
        agentSocket.emit('message', {
          message: data.message,
          timestamp: Date.now(),
          correspondentUsername: socket.user_info.userId,
          isFromUser: true,
        });
      }
      // Write message to db for transcript
      addMessageToUser(
        socket.user_info.userId,
        data.message,
        socket.user_agent_info.username,
        true,
      );
    }
  });

  socket.on('file-upload', async (data) => {
    // Return if invalid input
    if (!Buffer.isBuffer(data.file) || typeof data.name !== 'string') {
      return;
    }
    const fileType = await fileTypeFromBuffer(data.file);
    // Return if file type isn't allowed
    if (!validateFileType(fileType.mime)) {
      return;
    }
    // Convert file to b64
    const base64File = Buffer.from(data.file).toString('base64');
    // Agent case
    if (socket.auth_token) {
      if (typeof data.userId !== 'string') {
        return;
      }
      // Only allow agent to message assigned users
      if (!isUserIdAssignedToAgent(data.userId, socket.auth_token.username)) {
        return;
      }
      const userSocket = getSocketForUser(data.userId);
      if (userSocket) {
        // Notify user
        userSocket.emit('message', {
          message: data.message,
          timestamp: Date.now(),
          correspondentUsername: socket.auth_token.username,
          isFromUser: false,
          file: {
            file: base64File,
            fileName: data.name,
            fileType: fileType.mime,
          },
        });
        // Notify agent of file
        socket.emit('message', {
          message: data.message,
          timestamp: Date.now(),
          correspondentUsername: data.userId,
          isFromUser: false,
          file: {
            file: base64File,
            fileName: data.name,
            fileType: fileType.mime,
          },
        });
      }
      // Write file & message to db for transcript
      try {
        const fileId = await writeFile(base64File, data.name, fileType.mime);
        if (fileId) {
          addFileToUser(data.userId, fileId, socket.auth_token.username, false);
        }
      } catch (err) {
        console.error(err);
      }
    } else {
      // User case
      const agentSocket = getSocketForAgent(socket.user_agent_info.username);
      if (agentSocket) {
        // Notify agent
        agentSocket.emit('message', {
          message: data.message,
          timestamp: Date.now(),
          correspondentUsername: socket.user_info.userId,
          isFromUser: true,
          file: {
            file: base64File,
            fileName: data.name,
            fileType: fileType.mime,
          },
        });
        // Notify user
        socket.emit('message', {
          message: data.message,
          timestamp: Date.now(),
          correspondentUsername: socket.user_agent_info.username,
          isFromUser: true,
          file: {
            file: base64File,
            fileName: data.name,
            fileType: fileType.mime,
          },
        });
      }
      // Write file & message to db for transcript
      try {
        const fileId = await writeFile(base64File, data.name, fileType.mime);
        if (fileId) {
          addFileToUser(socket.user_info.userId, fileId, socket.user_agent_info.username, true);
        }
      } catch (err) {
        console.error(err);
      }
    }
  });

  if (socket.auth_token) {
    socket.on('end-chat', (data) => {
      // Validate data
      if (typeof data.userId !== 'string' || !isUserIdAssignedToAgent(data.userId, socket.auth_token.username)) {
        return;
      }
      // Data is valid, disconnect user
      const userSocket = getSocketForUser(data.userId);
      if (userSocket) {
        userSocket.emit('chat-ended');
        userSocket.disconnect();
      } else {
        // Notify queue of removal
        removeAssignedUserId(data.userId, socket.auth_token.username);
      }
    });
  }

  socket.on('disconnect', async () => {
    if (socket.auth_token) {
      // Notify agents that agent is offline (for transferring)
      onlineAgents.delete(socket.auth_token.username);
      io.to('agents').emit('available_agents', [...onlineAgents]);
      // Notify queue of agent disconnect & remove socket mapping
      await handleAgentDisconnect(socket);
    } else if (socket.user_agent_info && socket.user_info) {
      // Notify agent of user disconnect
      const agentSocket = getSocketForAgent(socket.user_agent_info.username);
      if (agentSocket != null) {
        agentSocket.emit('user_disconnect', socket.user_info.userId);
      }
      // Notify queue that a spot is available & remove mapping
      await handleUserDisconnect(socket);
    }
  });
});
