// helper class for live_chat functionality relating to queues
const {
  setAgentOnline, setAgentOffline,
  userDisconnectedFromChat, isUserAssignedToAgent, userTransferredToAgent,
} = require('../queue/queue');
const { verifyAndParseLiveChatToken } = require('../queue/queue_token_utils');
const {
  setSocketForAgent, deleteSocketForAgent, setSocketForUser, deleteSocketForUser,
} = require('./socket_mapping');

/**
 * Sets the agent as available to chat and alerts the queue.
 * Also maps the agent to their socket -- can later be access via `getSocketForAgent()`
 * @param {Socket} socket
 */
const handleAgentLogin = async (socket) => {
  // Add agent to chat queue
  try {
    setSocketForAgent(socket.auth_token.username, socket);
    await setAgentOnline(socket.auth_token.username);
  } catch (err) {
    socket.disconnect();
  }
};

/**
 * Populates the user with their required info (user_info & user_agent_info)
 * and proceeds.
 * If their 1 time use token isn't valid, emit "auth_failed" and dc.
 * Also maps the userId to their socket -- can later be access via `getSocketForUser()`
 * @param {Socket} socket
 * @param {JSON} msg message containing token
 */
const handleUserLogin = async (socket, msg) => {
  if (typeof msg.token === 'string') {
    const token = await verifyAndParseLiveChatToken(msg.token);
    if (token) {
      // Populate socket with required data
      socket.user_info = {
        userId: token.userId,
        firstName: token.firstName,
        lastName: token.lastName,
      };
      socket.user_agent_info = {
        username: token.agentUsername,
      };
      setSocketForUser(token.userId, socket);
      return;
    }
  }
  // If auth failed, alert them & dc
  socket.emit('auth_failed', {});
  socket.disconnect();
};

/**
 * Marks the agent as offline, notifies the queue that capacity has been
 * reduced, and emits to all of the users they were chatting with:
 * ('enqueue', {token: string}) -- this token can be passed
 * to join_queue to skip to the front of the queue.
 * Also removes the socket mapping for the sockets agent username
 * @param {Socket} socket agents socket
 */
const handleAgentDisconnect = async (socket) => {
  try {
    setAgentOffline(socket.auth_token.username);
    deleteSocketForAgent(socket.auth_token.username);
  } catch (err) {
    console.error(err);
  }
};

/**
 * Notifies the queue that a space has became available.
 * Also removes the socket mapping for the sockets userId
 * @param {Socket} socket
 */
const handleUserDisconnect = async (socket) => {
  // Free up spot in queue
  if (socket.user_info) {
    await userDisconnectedFromChat(socket.user_info.userId, socket.user_agent_info.username);
    deleteSocketForUser(socket.user_info.userId);
  }
};

/**
 * Checks if the given userId is assigned to the agent.
 * @param {string} userId
 * @param {string} agentUsername
 * @returns true if the userId is assigned to the agent. False otherwise.
 */
const isUserIdAssignedToAgent = (userId, agentUsername) => {
  return isUserAssignedToAgent(userId, agentUsername);
};

/**
 * Removes the assigned user id -- when an agent ends a chat with a user
 * @param {string} userId
 * @param {string} agentUsername
 */
const removeAssignedUserId = async (userId, agentUsername) => {
  await userDisconnectedFromChat(userId, agentUsername);
  deleteSocketForUser(userId);
};

/**
 * Assigns the user from originalAgentUsername to updatedAgentUsername.
 * We allow agents to be over-capacity when users are transferred.
 * @param {string} userId
 * @param {string} originalAgentUsername
 * @param {string} updatedAgentUsername
 */
const transferUser = async (userId, originalAgentUsername, updatedAgentUsername) => {
  await userTransferredToAgent(userId, originalAgentUsername, updatedAgentUsername);
};

module.exports = {
  handleAgentLogin,
  handleUserLogin,
  handleAgentDisconnect,
  handleUserDisconnect,
  isUserIdAssignedToAgent,
  removeAssignedUserId,
  transferUser,
};
