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
        return await anonymousUser.findOne({_id: id}).lean(true);
    } catch(err) {
        throw err;
    }
}

/**
 * Updates the users chatSocketId to the given one
 * @param {string} id userId
 * @param {string} chatSocketId
 * @returns true upon success, false if user not found.
 * @throws if a db error occurs.
 */
const updateUserChatSocketId = async (id, chatSocketId) => {
    try {
        const user = await anonymousUser.findOneAndUpdate({ _id: id }, { chatSocketId: chatSocketId }).lean(true);
        return user != null;
    } catch(err) {
        return false;
    }
}

/**
 * Creates a user for the given params.
 * @param {string} id userId
 * @param {string} firstName
 * @param {string} lastName
 * @returns the users id upon successful creation
 * @throws if a db error occurs.
 */
const addUser = async (chatSocketId, firstName, lastName) => {
    try {
        return (await anonymousUser.create({
            chatSocketId: chatSocketId,
            firstName: firstName,
            lastName: lastName,
            createdAt: getCurrentTimestamp(),
        }))._id.toString();
    } catch(err) {
        throw err;
    }
}

module.exports = {
    getUserById,
    updateUserChatSocketId,
    addUser
}