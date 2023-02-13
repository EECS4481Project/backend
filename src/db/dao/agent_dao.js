// database access object for users
const agent = require('../db_factory').agent;
const { getCurrentTimestamp } = require('../../utils');

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

/**
 * Registers an admin user with the given username & password.
 * @param {string} username 
 * @param {string} firstName 
 * @param {string} lastName 
 * @param {string} encryptedPassword 
 * @throws {Error} if username already exists, or there is a db error.
 */
const registerAdmin = async (username, firstName, lastName, encryptedPassword) => {
    try {
        await registerUser(username, firstName, lastName, encryptedPassword, true);
    } catch(err) {
        throw err;
    }
}

/**
 * Registers an agent with the given username & password.
 * @param {string} username 
 * @param {string} firstName 
 * @param {string} lastName 
 * @param {string} encryptedPassword 
 * @throws {Error} if username already exists, or there is a db error.
 */
const registerAgent = async (username, firstName, lastName, encryptedPassword) => {
    try {
        await registerUser(username, firstName, lastName, encryptedPassword, false);
    } catch(err) {
        throw err;
    }
}

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
    try {
        await agent.create({
            username: username,
            firstName: firstName,
            lastName: lastName,
            password: encryptedPassword,
            isAdmin: isAdmin,
            isRegistered: isAdmin, // Admins are registered by default. Agents aren't
            createdAt: getCurrentTimestamp()
        });
    } catch(err) {
        throw err;
    }
}


module.exports = {
    getAgentByUsername,
    registerAdmin,
    registerAgent
};