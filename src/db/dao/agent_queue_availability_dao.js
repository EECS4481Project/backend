const constants = require('../../constants');

// DAO for queue-related agent queries
const agent = require('../db_factory').agent;

const queueFields = {
    _id: 1,
    username: 1,
    firstName: 1,
    lastName: 1,
    isOnlineForUserChat: 1,
    chattingWithUsers: 1
}


/**
 * Returns all agents available to chat
 * @returns list of agents if found, null otherwise.
 * @throws {Error} if there is a database error.
 */
const getAllAvailableAgents = async () => {
    const filter = {
        isDeleted: false,
        isOnlineForUserChat: true
    }
    // Query all users who aren't at max capacity
    filter[`chattingWithUsers.${constants.MAX_USERS_PER_AGENT}`] = { "$exists": false };
    try {
        return await agent.find(filter, queueFields).lean();
    } catch (err) {
        throw err;
    }
}

/**
 * Sets the user as available to chat
 * @param {string} username username
 * @throws {Error} if there is a database error.
 */
const setAgentAsAvailableToChat = async (username) => {
    try {
        await agent.updateOne({ username: agentUsername, isDeleted: false },
            { isOnlineForUserChat: true, chattingWithUsers: [] }
        ).lean();
    } catch (err) {
        throw err;
    }
}

/**
 * Sets the user as not available to chat
 * @param {string} username username
 * @returns {list[string]} of user_ids the agent was chatting with
 * @throws {Error} if there is a database error.
 */
const setAgentAsNotAvailableToChatAndGetUsers = async (username) => {
    try {
        return await agent.findOneAndUpdate({ username: agentUsername, isDeleted: false },
            { isOnlineForUserChat: false, chattingWithUsers: [] },
            { fields: { chattingWithUsers: 1, _id: 0 } }
        ).lean().chattingWithUsers;
    } catch (err) {
        throw err;
    }
}

/**
 * Removes user from the agents chatting with list.
 * @param {string} agentUsername username of agent to update
 * @param {string} userId id of user to remove
 * @throws {Error} if there is a database error.
 */
const removeUserFromAgentChattingWithUsers = async (agentUsername, userId) => {
    try {
        await agent.updateOne({ username: agentUsername, isDeleted: false }, {
            $pullAll: {
                chattingWithUsers: [{ _id: userId }],
            }
        }).lean();
    } catch (err) {
        throw err;
    }
}

/**
 * Adds users to the agents chatting with list.
 * @param {string} agentUsername username of agent
 * @param {list[str]} userIds list of user ids to add to agents chatting with
 * @throws {Error} if there is a database error.
 */
const addUsersToAgentChattingWithUsers = async (agentUsername, userIds) => {
    try {
        await agent.updateOne({ username: agentUsername, isDeleted: false }, {
            $push: {
                chattingWithUsers: { $each: userIds }
            }
        },).lean();
    } catch (err) {
        throw err;
    }
}

module.exports = {
    getAllAvailableAgents,
    removeUserFromAgentChattingWithUsers,
    addUsersToAgentChattingWithUsers,
    setAgentAsAvailableToChat,
    setAgentAsNotAvailableToChatAndGetUsers
}