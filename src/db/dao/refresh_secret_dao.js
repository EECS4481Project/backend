const refreshSecret = require('../db_factory').refreshSecret;

/**
 * Stores a given encrypted secret -- to be used for refresh tokens.
 * @param {string} username
 * @param {string} encryptedSecret encrypted secret to store.
 * @returns the id of the stored refresh token.s
 * @throws if there is an error while writing to db.
 */
const storeRefreshSecret = async (username, encryptedSecret) => {
    try {
        const created = await refreshSecret.create({
            username: username,
            secret: encryptedSecret
        });
        return created._id;
    } catch(err) {
        throw err;
    }
}

/**
 * Deletes a refresh token secret of the given id, and returns its encrypted secret.
 * @param {string} id of the secret to find & delete.
 * @returns encrypted secret for the given id, null if not found.
 * @throws if something goes wrong while accessing the db.
 */
const getAndDeleteRefreshSecret = async (id) => {
    try {
        const deleted = await refreshSecret.findOneAndDelete({ _id: id }).lean(true);
        if (deleted == null) {
            return null;
        }
        return deleted.secret;
    } catch(err) {
        throw err;
    }
}

/**
 * Deletes all of the refresh tokens for the given username.
 * @param {string} username 
 * @returns true upon success, false otherwise.
 */
const deleteRefreshSecretsForUsername = async (username) => {
    try {
        return (await refreshSecret.deleteMany({ username: username }).lean(true)).acknowledged;
    } catch(err) {
        return false;
    }
}

module.exports = {
    storeRefreshSecret,
    getAndDeleteRefreshSecret,
    deleteRefreshSecretsForUsername
}