// DAO for queue tokens (used to access live chat or bypass queue)
const { CHAT_QUEUE_TOKEN_NAME, SKIP_QUEUE_TOKEN_NAME } = require('../../constants');
const { queueToken } = require('../db_factory');

/**
 * Deletes the skip queue token for the given user id.
 * @param {string} userId
 * @returns true if a user was deleted, false otherwise
 * @throws if there is a db error
 */
const deleteSkipQueueToken = async (userId) => {
  return queueToken.deleteOne({
    tokenType: SKIP_QUEUE_TOKEN_NAME,
    userId,
  }).then((res) => res && res.deletedCount === 1);
};

/**
 * Deletes the chat token for the given user id.
 * @param {string} userId
 * @returns true if a user was deleted, false otherwise
 * @throws if there is a db error
 */
const deleteChatToken = async (userId) => {
  return queueToken.deleteOne({
    tokenType: CHAT_QUEUE_TOKEN_NAME,
    userId,
  }).then((res) => res && res.deletedCount === 1);
};

/**
 * Adds a skip queue token for the given userId.
 * @param {string} userId
 * @throws if there is a db error
 */
const addSkipQueueToken = async (userId) => {
  return queueToken.create({
    tokenType: SKIP_QUEUE_TOKEN_NAME,
    userId,
  }).then(() => true);
};

/**
 * Adds a chat token for the given userId.
 * @param {string} userId
 * @throws if there is a db error
 */
const addChatToken = async (userId) => {
  return queueToken.create({
    tokenType: CHAT_QUEUE_TOKEN_NAME,
    userId,
  }).then(() => true);
};

module.exports = {
  deleteSkipQueueToken,
  deleteChatToken,
  addSkipQueueToken,
  addChatToken,
};
