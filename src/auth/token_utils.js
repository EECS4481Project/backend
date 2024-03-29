const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcrypt');

const refreshSecretDao = require('../db/dao/refresh_secret_dao');
const constants = require('../constants');
const { isProd, getCurrentTimestamp } = require('../utils');

if (!isProd()) {
  require('dotenv').config();
}

/**
 * Given an agent and a response, sets the auth and refresh tokens in the
 * response.
 * Returns 500 error code if there are any db failures.
 * @param {agent} agent
 * @param {Response} res
 */
const setNewAuthAndRefreshToken = async (agent, res) => {
  const authToken = generateAuthToken(
    agent.username,
    agent.firstName,
    agent.lastName,
    agent.isAdmin,
  );
  const refreshToken = await generateRefreshToken(agent.username);
  if (refreshToken == null) {
    return res.sendStatus(500);
  }
  setCookieAndHeader(res, authToken, refreshToken);
};

/**
 * Expires the original refresh token, and updates the auth & refresh tokens
 * If the refresh token is invalid, it will remove the refresh cookie.
 * @param {Response} res
 * @param {Object} authToken Json auth token
 * @param {Object} refreshToken Json refresh token
 * @returns true upon success, false upon failure
 */
const setRefreshedAuthAndRefreshToken = async (res, authToken, refreshToken) => {
  let encryptedSecret = null;
  try {
    encryptedSecret = await refreshSecretDao.getAndDeleteRefreshSecret(refreshToken.id);
  } catch (err) {
    console.error(err);
    return res.sendStatus(500);
  }
  // Case where refresh token wasn't found (possibly expired)
  if (encryptedSecret == null) {
    return false;
  }
  // Check if secret is valid
  const isValidSecret = await bcrypt.compare(refreshToken.secret, encryptedSecret);
  if (!isValidSecret) {
    res.clearCookie(constants.REFRESH_COOKIE_NAME);
    return false;
  }
  const newAuthToken = generateAuthToken(
    authToken.username,
    authToken.firstName,
    authToken.lastName,
    authToken.isAdmin,
  );
  const newRefreshToken = await generateRefreshToken(authToken.username);
  if (newRefreshToken == null) {
    res.clearCookie(constants.REFRESH_COOKIE_NAME);
    return res.sendStatus(500);
  }
  setCookieAndHeader(res, newAuthToken, newRefreshToken);
  return true;
};

/**
 * Returns the json auth token if it's valid (has correct public key)
 * @param {string} authToken
 * @returns json of auth token if valid, null otherwise.
 */
const getJsonAuthTokenIfValid = (authToken) => {
  try {
    return jwt.verify(authToken, process.env.AUTH_TOKEN_PRIVATE_KEY, {
      ignoreExpiration: true,
    });
  } catch (err) {
    return null;
  }
};

/**
 * Returns the json refresh token if it's valid (has correct public key)
 * @param {string} refresh
 * @returns json of refresh token if valid, null otherwise.
 */
const getJsonRefreshTokenIfValid = (refreshToken) => {
  try {
    return jwt.verify(refreshToken, process.env.REFRESH_TOKEN_PRIVATE_KEY, {
      ignoreExpiration: true,
    });
  } catch (err) {
    return null;
  }
};

/**
 * Generates an auth token for the given params.
 * @param {string} username
 * @param {string} firstName
 * @param {string} lastName
 * @param {boolean} isAdmin
 * @returns JWT (string) that acts as an auth token.
 */
const generateAuthToken = (username, firstName, lastName, isAdmin) => jwt.sign({
  username,
  firstName,
  lastName,
  isAdmin,
  exp: getCurrentTimestamp() + constants.AUTH_TOKEN_EXPIRY_SECONDS,
}, process.env.AUTH_TOKEN_PRIVATE_KEY);

/**
 * Generates a refresh token.
 * NOTE: Refresh tokens are whitelisted in the db and automatically expire
 * after REFRESH_TOKEN_EXPIRY_SECONDS.
 * @param {string} username
 * @returns JWT (string) that acts as a refresh token. Returns null if writing
 * to the db failed.
 */
const generateRefreshToken = async (username) => {
  // Generate & encrypt secret
  const secret = crypto.randomBytes(64).toString('hex');
  const encryptedSecret = await bcrypt.hash(secret, constants.PASSWORD_SALT_ROUNDS);
  // Store secret in db & get id
  try {
    const id = await refreshSecretDao.storeRefreshSecret(username, encryptedSecret);
    // Return JWT
    return jwt.sign({
      id,
      secret,
      exp: getCurrentTimestamp() + constants.REFRESH_TOKEN_EXPIRY_SECONDS,
    }, process.env.REFRESH_TOKEN_PRIVATE_KEY);
  } catch (err) {
    console.error(err);
    return null;
  }
};

/**
 * Sets the refresh cookie & auth header based on the given params.
 * @param {Response} res
 * @param {string} authToken
 * @param {string} refreshToken
 */
const setCookieAndHeader = (res, authToken, refreshToken) => {
  // Set cookie options
  const refreshTokenOptions = {
    maxAge: constants.REFRESH_TOKEN_EXPIRY_SECONDS * 1000,
    httpOnly: true,
    sameSite: 'strict',
  };
  // In prod, we should only use https
  if (isProd()) {
    refreshTokenOptions.secure = true;
  }
  res.cookie(constants.REFRESH_COOKIE_NAME, refreshToken, refreshTokenOptions);
  res.set(constants.AUTH_HEADER_NAME, authToken);
};

module.exports = {
  setNewAuthAndRefreshToken,
  setRefreshedAuthAndRefreshToken,
  getJsonAuthTokenIfValid,
  getJsonRefreshTokenIfValid,
};
