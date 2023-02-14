// Authentication functionality for help desk users
const express = require('express');
const bcrypt = require('bcrypt');

const router = express.Router();
const rateLimit = require('express-rate-limit');
const agentDao = require('../db/dao/agent_dao');
const refreshSecretDao = require('../db/dao/refresh_secret_dao');
const constants = require('../constants');
const { setNewAuthAndRefreshToken, getJsonAuthTokenIfValid, getJsonRefreshTokenIfValid, setRefreshedAuthAndRefreshToken } = require('./token_utils');
const { getCurrentTimestamp, isProd } = require('../utils');
const { checkPasswordRequirements } = require('./utils');

const rateLimiter = rateLimit({
	windowMs: 10 * 60 * 1000, // 10 minutes
	max: 10, // Limit each IP to max per `window`
	standardHeaders: false, // Disable the `RateLimit-*` headers
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

/**
 * When used as middleware, proceeds if request is from a signed in agent.
 * Also sets req.auth_token & req.refresh_token
 * Returns 401 status code otherwise.
 * Will also handle refreshing the users credentials.
 * Usage: router.get('/some_endpoint', isAgent, (req, res) => {...})
 * @param {*} req Request
 * @param {*} res Resolve
 * @param {*} next Callback to next request
 */
const isAgent = async (req, res, next) => {
    if (!req.cookies || !req.cookies.hasOwnProperty(constants.AUTH_COOKIE_NAME) ||
            !req.cookies.hasOwnProperty(constants.REFRESH_COOKIE_NAME)) {
        return res.sendStatus(401);
    }
    const auth = await getJsonAuthTokenIfValid(req.cookies[constants.AUTH_COOKIE_NAME]);
    const refresh = await getJsonRefreshTokenIfValid(req.cookies[constants.REFRESH_COOKIE_NAME]);
    if (auth == null || refresh == null) {
        return res.sendStatus(401);
    }
    // Renew auth token if needed
    if (auth.exp <= getCurrentTimestamp()) {
        const refreshed = await setRefreshedAuthAndRefreshToken(res, auth, refresh);
        if (!refreshed) {
            return res.sendStatus(401);
        }
    }
    // proceed
    req.auth_info = auth;
    req.refresh_info = refresh;
    next();
}

/**
 * When used as middleware, populates req.agent_name and proceeds.
 * If no agent_name is found, req.agent_name will be null.
 * NOTE: isAgent middleware must be called first.
 * @param {Request} req 
 * @param {Response} res 
 * @param {NextFunction} next 
 */
const getName = async (req, res, next) => {
    if (req.auth_info) {
        req.agent_name = req.auth_info.firstName + " " + req.auth_info.lastName;
    }
    next();
}

/**
 * Returns a 200 status code if the user is signed in. Returns a 401 status code
 * otherwise.
 */
router.get('/is_logged_in', isAgent, getName, (req, res) => {
    res.sendStatus(200);
});

/**
 * Given a json of { username: string, password: string } attempts to log in.
 * @see{updatePassword} for response codes.
 */
router.post('/login', rateLimiter, async (req, res) => {
    const username = req.body.username;
    const password = req.body.password;
    if (typeof username != 'string' || typeof password != 'string') {
        return res.sendStatus(400);
    }
    await login(username, password, res);
});

/**
 * Deletes the users refresh token from the db, and wipes their auth & refresh
 * cookies.
 */
router.post('/logout', isAgent, async (req, res) => {
    refreshSecretDao.getAndDeleteRefreshSecret(req.refresh_info.id);
    res.clearCookie(constants.AUTH_COOKIE_NAME);
    res.clearCookie(constants.REFRESH_COOKIE_NAME);
    res.sendStatus(200);
})

/**
 * Given a json {username: string, password: string, newPassword: string}:
 * validates the given password, updates the users password,
 * and sets them to isRegistered.
 * @see{updatePassword} for response codes.
 * - 400 error code on invalid input (ie. password is the same as newPassword)
 */
router.post('/register', rateLimiter, async (req, res) => {
    const username = req.body.username;
    const password = req.body.password;
    const newPassword = req.body.newPassword;
    if (typeof password != "string" || typeof username != "string"
            || typeof newPassword != "string") {
        return res.sendStatus(400);
    }
    // Don't allow password reuse
    if (password === newPassword) {
        return res.sendStatus(400);
    }
    // Validate that the given password is valid
    try {
        const agent = await getAgentIfPasswordMatches(username, password);
        if (agent == null) {
            return res.sendStatus(400);
        }
    } catch(err) {
        return res.sendStatus(500);
    }
    // Update the password & set them to registered
    if (await updatePassword(username, newPassword, true, res)) {
        // Log user in
        await login(username, newPassword, res);   
    }
});

/**
 * Given a json {password: string}: validates the given password,
 * and updates the users password.
 * @see{updatePassword} for response codes.
 */
router.post('/change_password', isAgent, async (req, res) => {
    const password = req.body.password;
    if (typeof password != "string") {
        return res.sendStatus(400);
    }
    if (await updatePassword(req.auth_info.username, password, true, res)) {
        res.sendStatus(200)
    }
    // TODO: Consider deleting all other refresh tokens as a security measure
})


/**
 * Given a username & password, attempts to log in.
 * If successful, returns the following cookies:
 *   - HttpOnly REFRESH -- long lived cookie for obtaining a new AUTH token
 *   - AUTH -- short lived authentication cookie
 * - Returns 409 if the user isn't registered but the credentials are correct.
 * - If given invalid credentials, or invalid input returns 400.
 * - If too many calls were made by the given IP, it will rate limit them
 *   returning 429.
 * - Returns 500 if there's an internal error.
 * @param {string} username
 * @param {string} password
 * @param {Response} res
 */
const login = async (username, password, res) => {
    try {
        const agent = await getAgentIfPasswordMatches(username, password);
        if (agent == null) {
            return res.sendStatus(400);
        }
        if (!agent.isRegistered) {
            return res.sendStatus(409);
        }
        // Username & password are valid, return auth info
        await setNewAuthAndRefreshToken(agent, res);
        return res.sendStatus(200);
    } catch(err) {
        // Error case
        return res.sendStatus(500);
    }
}

/**
 * Returns an agent if one is found with the given username & password.
 * @param {string} username 
 * @param {string} password 
 * @returns an agent if one is found with the given username & password. Null
 * otherwise.
 * @throws error if something goes wrong while fetching the user.
 */
const getAgentIfPasswordMatches = async (username, password) => {
    try {
        const agent = await agentDao.getAgentByUsername(username);
        // User not found case
        if (agent == null) {
            return null;
        }
        // Compare password
        const isPasswordEqual = await bcrypt.compare(password, agent.password);
        if (!isPasswordEqual) {
            return null;
        }
        return agent;
    } catch(err) {
        throw err;
    }
}

/**
 * Validates the given password, and sets it for the agents username if valid.
 * Also sets isRegistered while updating the agent.
 * - Returns 200 upon success
 * - Returns 400 upon invalid data
 * - Returns 500 upon internal error
 * @param {string} username 
 * @param {string} password 
 * @param {boolean} isRegistered 
 * @param {Response} res 
 * @returns false upon failure, true upon success.
 */
const updatePassword = async (username, password, isRegistered, res) => {
    // Validate password
    if (isProd() && !checkPasswordRequirements(password)) {
        res.sendStatus(400);
        return false;
    }
    // Encrypt password
    const encryptedPassword = await bcrypt.hash(password, constants.PASSWORD_SALT_ROUNDS);
    try {
        // Store password
        const updated = await agentDao.updateAgent(username, {
            password: encryptedPassword,
            isRegistered: isRegistered
        });
        if (updated) {
            return true;
        }
    } catch(err) {}
    res.sendStatus(500);
    return false;
}

exports.router = router;
exports.isAgent = isAgent;
exports.getName = getName;