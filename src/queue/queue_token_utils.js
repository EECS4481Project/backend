// Utils for handling queue tokens (that grant access to the chat, or allow skipping the queue)
const jwt = require('jsonwebtoken');
const constants = require('../constants');
const { addSkipQueueToken, addChatToken, deleteChatToken, deleteSkipQueueToken } = require('../db/dao/queue_token_dao');
const { isProd, getCurrentTimestamp } = require('../utils');

if (!isProd()) {
    require('dotenv').config();
}

/**
 * Generates a 1-time use JWT that's required to enter the live-chat.
 * 1-time use as it's stored in a database for deletion upon verification.
 * @param {string} userId 
 * @param {string} userFirstName 
 * @param {string} userLastName 
 * @param {string} agentUsername 
 * @returns string of the live chat token. Returns null if an error occurs.
 */
const generateLiveChatToken = async (userId, userFirstName, userLastName, agentUsername) => {
    try {
       const token = await jwt.sign({
            userId: userId,
            firstName: userFirstName,
            lastName: userLastName,
            agentUsername: agentUsername,
            exp: getCurrentTimestamp() + constants.LIVE_CHAT_TOKEN_EXPIRY_SECONDS
        }, process.env.QUEUE_CHAT_PRIVATE_KEY);
        await addChatToken(userId);
        return token;
    } catch(err) {
        console.error(err);
        return null;
    }
}

/**
 * Generates a 1-time use JWT that allows them to skip to the front of the queue.
 * 1-time use as it's stored in a database for deletion upon verification.
 * @param {string} userId userId
 * @returns string of the queue skip token. Returns null if an error occurs.
 */
const generateFrontOfLineToken = async (userId, firstName, lastName) => {
    try {
        const token = await jwt.sign({
            userId: userId,
            firstName: firstName,
            lastName: lastName,
            exp: getCurrentTimestamp() + constants.LIVE_CHAT_TOKEN_EXPIRY_SECONDS
        }, process.env.QUEUE_SKIP_PRIVATE_KEY);
        await addSkipQueueToken(userId);
        return token;
    } catch(err) {
        console.error(err);
        return null;
    }
}

/**
 * Given a live chat token, applies the 1-time use of the token and validates
 * that the token is legit (signed by us).
 * JWT format:
 * {
            userId: string,
            firstName: string,
            lastName: string,
            agentUsername: string,
    }
 * @param {string} chatToken 
 * @returns JSON representing the jwt upon success. Null otherwise
 */
const verifyAndParseLiveChatToken = async (chatToken) => {
    try {
        const token = jwt.verify(chatToken, process.env.QUEUE_CHAT_PRIVATE_KEY)
        const deleted = await deleteChatToken(token.userId);
        if (deleted) {
            return token;
        }
        return null;
    } catch(err) {
        console.error(err);
        return null;
    }
}

/**
 * Given a skip queue token, applies the 1-time use of the token and validates
 * that the token is legit (signed by us).
 * JWT format:
 * {
            userId: string,
            firstName: string,
            lastName: string,
    }
 * @param {string} queueToken 
 * @returns JSON representing the jwt upon success. Null otherwise
 */
const verifyAndParseFrontOfQueueToken = async (queueToken) => {
        try {
            const token = jwt.verify(queueToken, process.env.QUEUE_SKIP_PRIVATE_KEY);
            const deleted = await deleteSkipQueueToken(token.userId);
            if (deleted) {
                return token;
            }
            return null;
        } catch(err) {
            console.error(err);
            return null;
        }
    }

module.exports = {
    generateLiveChatToken,
    generateFrontOfLineToken,
    verifyAndParseLiveChatToken,
    verifyAndParseFrontOfQueueToken
}