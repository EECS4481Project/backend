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

module.exports = {
    getUserById,
    addUser
}