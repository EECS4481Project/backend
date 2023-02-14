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
    try {
        const user = await agent.findOne({ username: username }).lean();
        return user ? user : null;
    } catch(err) {
        throw err;
    }
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
 * Updates the agent of username with the given dataToUpdate
 * NOTE: Username cannot be updated
 * @param {string} username 
 * @param {agent} dataToUpdate 
 * @returns true upon success, false otherwise
 * @throws error if an error occurred while writing to db.
 */
const updateAgent = async (username, dataToUpdate) => {
    // NOTE: Username cannot be updated
    if (dataToUpdate.hasOwnProperty("username")) {
        return false;
    }
    try {
        const res = await agent.findOneAndUpdate({ username: username }, dataToUpdate).lean(true);
        return res ? true : false
    } catch(err) {
        throw err;
    }
}

/**
 * Gets all registered users
 * @returns All registered users
 * @throws if there is a database error.
 */
const getAllRegisteredUsers = async () => {
    try {
        return await agent.find({ isRegistered: true }, {
            'username': 1, 'firstName': 1, 'lastName': 1, '_id': 0
        }).lean(true);
    } catch(err) {
        throw err;
    }
}

/**
 * Gets all non-registered users
 * @returns All non-registered users
 * @throws if there is a database error.
 */
const getAllNonRegisteredUsers = async () => {
    try {
        return await agent.find({ isRegistered: false }, {
            'username': 1, 'firstName': 1, 'lastName': 1, '_id': 0
        }).lean(true);
    } catch(err) {
        throw err;
    }
}

/**
 * Deletes the user of the given username.
 * @param {string} username 
 * @returns true upon successful deletion, false otherwise.
 * @throws if there is a database error.
 */
const deleteUser = async (username) => {
    try {
        return (await agent.deleteOne({ username: username }).lean(true)).deletedCount == 1;
    } catch(err) {
        return false;
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
    registerAgent,
    updateAgent,
    getAllRegisteredUsers,
    getAllNonRegisteredUsers,
    deleteUser
};