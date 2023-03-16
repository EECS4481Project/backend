const { refreshSecret } = require('../db_factory');

/**
 * Stores a given encrypted secret -- to be used for refresh tokens.
 * @param {string} username
 * @param {string} encryptedSecret encrypted secret to store.
 * @returns the id of the stored refresh token.s
 * @throws if there is an error while writing to db.
 */
const storeRefreshSecret = async (username, encryptedSecret) => {
  return refreshSecret.create({
    username,
    secret: encryptedSecret,
  }).then((res) => res._id.toString());
};

/**
 * Deletes a refresh token secret of the given id, and returns its encrypted secret.
 * @param {string} id of the secret to find & delete.
 * @returns encrypted secret for the given id, null if not found.
 * @throws if something goes wrong while accessing the db.
 */
const getAndDeleteRefreshSecret = async (id) => {
  return refreshSecret.findOneAndDelete({ _id: id }).then((res) => {
    if (res) {
      return res.secret;
    }
    return null;
  });
};

/**
 * Deletes all of the refresh tokens for the given username.
 * @param {string} username
 * @returns true upon success, false otherwise.
 * @throws if there is a database error.
 */
const deleteRefreshSecretsForUsername = async (username) => {
  return refreshSecret.deleteMany({ username }).then((res) => res && res.acknowledged);
};

module.exports = {
  storeRefreshSecret,
  getAndDeleteRefreshSecret,
  deleteRefreshSecretsForUsername,
};
