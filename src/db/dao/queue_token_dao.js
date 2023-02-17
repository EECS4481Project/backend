// DAO for queue tokens (used to access live chat or bypass queue)
const { CHAT_QUEUE_TOKEN_NAME, SKIP_QUEUE_TOKEN_NAME } = require("../../constants")
const { queueToken } = require("../db_factory")

/**
 * Deletes the skip queue token for the given user id.
 * @param {string} userId 
 * @returns true if a user was deleted, false otherwise
 * @throws if there is a db error
 */
const deleteSkipQueueToken = async (userId) => {
    try {
        return (await queueToken.deleteOne({tokenType: SKIP_QUEUE_TOKEN_NAME, userId: userId}).lean(true)).deletedCount == 1
    } catch(err) {
        throw err;
    }
}

/**
 * Deletes the chat token for the given user id.
 * @param {string} userId 
 * @returns true if a user was deleted, false otherwise
 * @throws if there is a db error
 */
const deleteChatToken = async (userId) => {
    try {
        return (await queueToken.deleteOne({tokenType: CHAT_QUEUE_TOKEN_NAME, userId: userId}).lean(true)).deletedCount == 1
    } catch(err) {
        throw err;
    }
}

/**
 * Adds a skip queue token for the given userId.
 * @param {string} userId 
 * @throws if there is a db error
 */
const addSkipQueueToken = async (userId) => {
    try {
        await queueToken.create({
            tokenType: SKIP_QUEUE_TOKEN_NAME,
            userId: userId
        });
    } catch(err) {
        throw err;
    }
}

/**
 * Adds a chat token for the given userId.
 * @param {string} userId 
 * @throws if there is a db error
 */
const addChatToken = async (userId) => {
    try {
        await queueToken.create({
            tokenType: CHAT_QUEUE_TOKEN_NAME,
            userId: userId
        });
    } catch(err) {
        throw err;
    }
}

module.exports = {
    deleteSkipQueueToken,
    deleteChatToken,
    addSkipQueueToken,
    addChatToken
}