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
 * Generates an auth token for the given params.
 * @param {string} username 
 * @param {string} firstName 
 * @param {string} lastName 
 * @param {boolean} isAdmin
 * @returns JWT (string) that acts as an auth token.
 */
const generateAuthToken = async (username, firstName, lastName, isAdmin) => {
    return await jwt.sign({
        username: username,
        firstName: firstName,
        lastName: lastName,
        isAdmin: isAdmin,
        exp: getCurrentTimestamp() + constants.AUTH_TOKEN_EXPIRY_SECONDS
    }, process.env.AUTH_TOKEN_PRIVATE_KEY);
}

/**
 * Generates a refresh token.
 * NOTE: Refresh tokens are whitelisted in the db and automatically expire
 * after REFRESH_TOKEN_EXPIRY_SECONDS.
 * @returns JWT (string) that acts as a refresh token.
 */
const generateRefreshToken = async () => {
    // Generate & encrypt secret
    const secret = crypto.randomBytes(64).toString('hex');
    const encryptedSecret = await bcrypt.hash(secret, constants.PASSWORD_SALT_ROUNDS);
    // Store secret in db & get id
    const id = await refreshSecretDao.storeRefreshSecret(encryptedSecret);
    // Return JWT
    return await jwt.sign({
        id: id,
        secret: secret,
        exp: getCurrentTimestamp() + constants.REFRESH_TOKEN_EXPIRY_SECONDS
    }, process.env.AUTH_TOKEN_PRIVATE_KEY);
    
}

/**
 * Given an agent and a response, sets the auth and refresh tokens in the
 * response.
 * @param {agent} agent
 * @param {Response} res 
 */
const setNewAuthAndRefreshToken = async (agent, res) => {
    const authToken = await generateAuthToken(agent.username, agent.firstName, agent.lastName, agent.isAdmin);
    const refreshToken = await generateRefreshToken();
    // Set cookie options
    const authTokenOptions = {
        maxAge: constants.AUTH_TOKEN_EXPIRY_SECONDS * 1000,
        sameSite: 'strict'
    };
    const refreshTokenOptions = {
        maxAge: constants.REFRESH_TOKEN_EXPIRY_SECONDS * 1000,
        httpOnly: true,
        sameSite: 'strict'
    }
    // In prod, we should only use https
    if (isProd()) {
        authTokenOptions["secure"] = true;
        refreshTokenOptions["secure"] = true;
    }
    res.cookie("refresh", refreshToken, {
        maxAge: constants.REFRESH_TOKEN_EXPIRY_SECONDS * 1000,
        httpOnly: true,
        sameSite: 'strict'
    });
    res.cookie("auth", authToken, {
        maxAge: constants.AUTH_TOKEN_EXPIRY_SECONDS * 1000,
        sameSite: 'strict'
    })
}

module.exports = {
    generateAuthToken,
    generateRefreshToken,
    setNewAuthAndRefreshToken
}