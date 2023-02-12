// database access object for users
const user = require('./db_factory').user

/**
 * Returns a user for the given username.
 * @param {*} username username
 * @returns user if found, null otherwise.
 */
async function getUserByUsername(username) {
    const user = await user.findOne({ username: username }).lean();
    return user ? user : null;
}