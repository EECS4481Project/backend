// For storing the agents socket (ie. to notify them when a user is assigned)
const agentToSocketMapping = {};
const userToSocketMapping = {}; // For storing userIds to sockets

/**
 * Gets the chat socket for the given agent username
 * @param {string} username agents username
 * @returns socket if found, null otherwise
 */
const getSocketForAgent = (username) => {
  if (Object.prototype.hasOwnProperty.call(agentToSocketMapping, username)) {
    return agentToSocketMapping[username];
  }
  return null;
};

/**
 * Sets the chat socket for the given agent username
 * @param {string} username agents username
 * @param {socket} socket
 */
const setSocketForAgent = (username, socket) => {
  agentToSocketMapping[username] = socket;
};

/**
 * Deletes the socket for the given agent username
 * @param {string} username agents username
 */
const deleteSocketForAgent = (username) => {
  delete agentToSocketMapping[username];
};

/**
 * Gets the chat socket for the given userId
 * @param {string} userId
 * @returns socket if found, null otherwise
 */
const getSocketForUser = (userId) => {
  if (Object.prototype.hasOwnProperty.call(userToSocketMapping, userId)) {
    return userToSocketMapping[userId];
  }
  return null;
};

/**
 * Sets the chat socket for the given userId
 * @param {string} userId
 * @param {socket} socket
 */
const setSocketForUser = (userId, socket) => {
  userToSocketMapping[userId] = socket;
};

/**
 * Deletes the socket for the given userId
 * @param {string} userId users id
 */
const deleteSocketForUser = (userId) => {
  delete userToSocketMapping[userId];
};

module.exports = {
  getSocketForAgent,
  setSocketForAgent,
  deleteSocketForAgent,
  getSocketForUser,
  setSocketForUser,
  deleteSocketForUser,
};
