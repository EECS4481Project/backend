// dao for agent related queries
const { agent } = require('../db_factory');
const { getCurrentTimestamp } = require('../../utils');

const authFields = {
  _id: 1,
  username: 1,
  firstName: 1,
  lastName: 1,
  password: 1,
  isDeleted: 1,
  isAdmin: 1,
  isRegistered: 1,
  createdAt: 1,
};

const getEndpointFields = {
  username: 1,
  firstName: 1,
  lastName: 1,
  isDeleted: 1,
  isAdmin: 1,
  _id: 0,
};

/**
 * Returns an agent for the given username.
 * @param {string} username username
 * @returns agent if found, null otherwise.
 * @throws {Error} if there is a database error.
 */
const getAgentByUsername = async (username) => {
  return agent.findOne(
    { username, isDeleted: false },
    authFields,
  ).lean();
};

/**
 * Registers an admin user with the given username & password.
 * @param {string} username
 * @param {string} firstName
 * @param {string} lastName
 * @param {string} encryptedPassword
 * @throws {Error} if username already exists, or there is a db error.
 */
const registerAdmin = async (username, firstName, lastName, encryptedPassword) => {
  return registerUser(username, firstName, lastName, encryptedPassword, true);
};

/**
 * Registers an agent with the given username & password.
 * @param {string} username
 * @param {string} firstName
 * @param {string} lastName
 * @param {string} encryptedPassword
 * @throws {Error} if username already exists, or there is a db error.
 */
const registerAgent = async (username, firstName, lastName, encryptedPassword) => {
  return registerUser(username, firstName, lastName, encryptedPassword, false);
};

/**
 * Updates the agent of username with the given dataToUpdate
 * NOTE: Username cannot be updated
 * @param {string} username
 * @param {agent} dataToUpdate
 * @returns true upon success, false otherwise
 * @throws error if an error occurred while writing to db.
 */
const updateAgent = async (username, dataToUpdate) => {
  // NOTE: Username cannot be updated
  if (Object.prototype.hasOwnProperty.call(dataToUpdate, 'username')) {
    return false;
  }
  return agent.updateOne(
    { username, isDeleted: false },
    dataToUpdate,
    { fields: authFields },
  ).lean(true).then((res) => !!res);
};

/**
 * Gets all registered users
 * @returns All registered users
 * @throws if there is a database error.
 */
const getAllRegisteredUsers = async () => {
  return agent.find({ isRegistered: true, isDeleted: false }, getEndpointFields).lean(true);
};

/**
 * Gets all non-registered users
 * @returns All non-registered users
 * @throws if there is a database error.
 */
const getAllNonRegisteredUsers = async () => {
  return agent.find({ isRegistered: false, isDeleted: false }, getEndpointFields).lean(true);
};

/**
 * Gets all deleted users
 * @returns All deleted users
 * @throws if there is a database error.
 */
const getAllDeletedUsers = async () => {
  return agent.find({ isDeleted: true }, getEndpointFields).lean(true);
};

/**
 * Deletes the user of the given username.
 * @param {string} username
 * @returns true upon successful deletion, false otherwise.
 * @throws if there is a database error.
 */
const deleteUser = async (username) => {
  return agent.findOneAndUpdate(
    { username, isDeleted: false },
    { isDeleted: true },
    { fields: authFields },
  ).lean(true).then((res) => !!res);
};

/**
 * Registers a user with the given params.
 * Throws an error if the username already exists.
 * @param {string} username
 * @param {string} firstName
 * @param {string} lastName
 * @param {string} encryptedPassword
 * @param {string} isAdmin true if the user is an admin. False if not.
 * @throws {Error} if username already exists, or there is a db error.
 */
const registerUser = async (username, firstName, lastName, encryptedPassword, isAdmin) => {
  return agent.create({
    username,
    firstName,
    lastName,
    password: encryptedPassword,
    isAdmin,
    isRegistered: isAdmin, // Admins are registered by default. Agents aren't
    createdAt: getCurrentTimestamp(),
    chattingWithAgentUsernames: [],
  }).then(() => true);
};

/**
 * Returns a list of agent usernames that the agent is currently chatting with.
 * @param {string} username agent to query
 * @returns list of agent usernames that the agent is currently chatting with.
 * @throws {Error} if there is a db error.
 */
const getChattingWithAgentUsernames = async (username) => {
  return agent.findOne(
    {
      username, isAdmin: false, isDeleted: false, isRegistered: true,
    },
    { chattingWithAgentUsernames: 1, _id: 0 },
  ).lean().then((res) => {
    if (res) {
      return res.chattingWithAgentUsernames;
    }
    return [];
  });
};

/**
 * Adds username2 to usernames chattingWithAgents list.
 * @param {string} username
 * @param {string} username2
 * @throws {Error} if there is a db error.
 */
const addUsernameToChattingWithAgents = async (username, username2) => {
  return agent.findOneAndUpdate(
    {
      username, isAdmin: false, isDeleted: false, isRegistered: true,
    },
    { $addToSet: { chattingWithAgentUsernames: username2 } },
  ).then(() => true);
};

/**
 * Removes username2 to usernames chattingWithAgents list.
 * @param {string} username
 * @param {string} username2
 * @throws {Error} if there is a db error.
 */
const removeUsernameFromChattingWithAgents = async (username, username2) => {
  return agent.findOneAndUpdate(
    {
      username, isAdmin: false, isDeleted: false, isRegistered: true,
    },
    { $pull: { chattingWithAgentUsernames: username2 } },
  ).then(() => true);
};

/**
 * Returns a list of all agent usernames
 * @param {string} username
 * @returns list of all agent usernames
 * @throws {Error} if there is a db error.
 */
const getAllAgentUsernames = async () => {
  return agent.find(
    { isAdmin: false, isDeleted: false, isRegistered: true },
    { username: 1, _id: 0 },
  ).lean(true);
};

module.exports = {
  getAgentByUsername,
  registerAdmin,
  registerAgent,
  updateAgent,
  getAllRegisteredUsers,
  getAllNonRegisteredUsers,
  getAllDeletedUsers,
  deleteUser,
  getChattingWithAgentUsernames,
  addUsernameToChattingWithAgents,
  removeUsernameFromChattingWithAgents,
  getAllAgentUsernames,
};
