// Write message
// Get all messages for sender, receiver (only get 20 messages at a time -- allow page offset)

const constants = require('../../constants');
const { agentMessages } = require('../db_factory');

/**
 * Gets a page of all messages between the 2 agent usernames
 * @param {string} username1
 * @param {string} username2
 * @param {number} lastTimestamp Used for pagination (oldest timestamp of prev page)
 * @returns {[agentMessages]} list of agent messages.
 * @throws if there is a db error
 */
const getPageOfMessagesBetweenUsers = async (username1, username2, lastTimestamp) => {
  return agentMessages.find({
    $or: [
      { senderUsername: username1, $and: [{ receiverUsername: username2 }] },
      { senderUsername: username2, $and: [{ receiverUsername: username1 }] },
    ],
    timestamp: { $lt: lastTimestamp },
  }, {
    message: 1, timestamp: 1, senderUsername: 1, fileId: 1, _id: 0,
  }).sort({ timestamp: -1 }).limit(constants.AGENT_MESSAGE_FETCH_LIMIT).lean();
};

/**
 * Writes message to the db.
 * @param {string} senderUsername
 * @param {string} receiverUsername
 * @param {string} message
 * @throws if there is a db error
 */
const writeMessage = async (senderUsername, receiverUsername, message) => {
  return agentMessages.create({
    senderUsername,
    receiverUsername,
    message,
    timestamp: Date.now(),
  }).then(() => true);
};

/**
 * Writes file id to the db as a message.
 * @param {string} senderUsername
 * @param {string} receiverUsername
 * @param {string} message
 * @throws if there is a db error
 */
const writeFileMessage = async (senderUsername, receiverUsername, fileId) => {
  return agentMessages.create({
    senderUsername,
    receiverUsername,
    message: '',
    fileId,
    timestamp: Date.now(),
  }).then(() => true);
};

module.exports = {
  getPageOfMessagesBetweenUsers,
  writeMessage,
  writeFileMessage,
};
