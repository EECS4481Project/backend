
// Write message
// Get all messages for sender, receiver (only get 20 messages at a time -- allow page offset)

const constants = require("../../constants");
const { agentMessages } = require("../db_factory");

/**
 * Gets a page of all messages between the 2 agent usernames
 * @param {string} username1 
 * @param {string} username2 
 * @param {number} lastTimestamp Used for pagination (oldest timestamp of prev page)
 * @returns {[agentMessages]} list of agent messages.
 * @throws if there is a db error
 */
const getPageOfMessagesBetweenUsers = async (username1, username2, lastTimestamp) => {
    try {
        return await agentMessages.find({
            $or: [
                { senderUsername: username1, $and: [{ receiverUsername: username2 }] },
                { senderUsername: username2, $and: [{ receiverUsername: username1 }] }
            ],
            timestamp: { $lt: lastTimestamp }
        }, { message: 1, timestamp: 1, senderUsername: 1, _id: 0 }).sort({ timestamp: -1 }).limit(constants.AGENT_MESSAGE_FETCH_LIMIT).lean();
    } catch(err) {
        throw err;
    }
}

/**
 * Writes message to the db.
 * @param {string} senderUsername 
 * @param {string} receiverUsername 
 * @param {string} message 
 * @throws if there is a db error
 */
const writeMessage = async (senderUsername, receiverUsername, message) => {
    try {
        await agentMessages.create({
            senderUsername: senderUsername,
            receiverUsername, receiverUsername,
            message: message,
            timestamp: Date.now()
        });
    } catch(err) {
        throw err;
    }
}

module.exports = {
    getPageOfMessagesBetweenUsers,
    writeMessage
}