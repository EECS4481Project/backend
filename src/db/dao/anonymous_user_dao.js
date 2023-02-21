// DAO for anonymous users (users in live-chat)
const { getCurrentTimestamp } = require("../../utils");
const { anonymousUser } = require("../db_factory")

/**
 * Returns the user with the given id
 * @param {string} id userId
 * @returns User if found, null otherwise
 * @throws if a db error occurs.
 */
const getUserById = async (id) => {
    try {
        return await anonymousUser.findOne({_id: id}, {firstName: 1, lastName: 1, createdAt: 1}).lean(true);
    } catch(err) {
        throw err;
    }
}

/**
 * Creates a user for the given params.
 * @param {string} firstName
 * @param {string} lastName
 * @returns the users id upon successful creation
 * @throws if a db error occurs.
 */
const addUser = async (firstName, lastName) => {
    try {
        return (await anonymousUser.create({
            firstName: firstName,
            lastName: lastName,
            createdAt: getCurrentTimestamp(),
        }))._id.toString();
    } catch(err) {
        throw err;
    }
}

/**
 * Adds the message to the given userId
 * @param {string} userId 
 * @param {string} message 
 * @param {string} correspondentUsername Agents username
 * @param {boolean} isFromUser true if the userId is the sender. False if the agent is.
 * @throws if there is a db error
 */
const addMessageToUser = async (userId, message, correspondentUsername, isFromUser) => {
    try {
        await anonymousUser.findOneAndUpdate({ _id: userId }, {
            $push: {
                messages: {
                    message: message,
                    correspondentUsername: correspondentUsername,
                    isFromUser: isFromUser,
                    timestamp: Date.now()
                }
            }
        })
    } catch(err) {
        throw err;
    }
}

/**
 * Doesn't support paging, as anonymous chats are short-lived.
 * Returns all messages for th given user id.
 * @param {string} userId 
 * @return list of messages
 * @throws if there is a db error
 */
const getMessagesByUserId = async (userId) => {
    try {
        return (await anonymousUser.findOne({ _id: userId }, {messages: 1, _id: 0}).sort({timestamp: -1}).lean()).messages;
    } catch(err) {
        throw err;
    }
}

module.exports = {
    getUserById,
    addUser,
    addMessageToUser,
    getMessagesByUserId
}