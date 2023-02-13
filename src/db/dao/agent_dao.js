// database access object for users
const agent = require('../db_factory').agent

/**
 * Returns an agent for the given username.
 * @param {string} username username
 * @returns agent if found, null otherwise.
 * @throws {Error} if there is a database error.
 */
const getAgentByUsername = async (username) => {
    const user = await agent.findOne({ username: username }).lean();
    return user ? user : null;
}



module.exports = {
    getAgentByUsername,
};