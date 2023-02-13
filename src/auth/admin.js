/**
 * Functions and endpoints for admin functionality.
 */
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const express = require('express');
const { checkPasswordRequirements } = require('./utils');
const agentDao = require('../db/dao/agent_dao');
const auth = require('./auth');
const { isMongoDuplicateKeyError, isProd } = require('../utils');
const constants = require('../constants');
// Only use dotenv (ie. .env) file in dev mode
// In prod, it should consume the real environment
if (!isProd()) {
    require('dotenv').config();
}

const router = express.Router();

/**
 * When used as middleware, proceeds if request is from a signed in admin.
 * Returns 401 status code otherwise.
 * Will also handle refreshing the users credentials.
 * Usage: router.get('/some_endpoint', isAgent, (req, res) => {...})
 * @param {Request} req Request
 * @param {Response} res Resolve
 * @param {Next} next Next request
*/
const isAdmin = async (req, res, next) => {
    auth.isAgent(req, res, () => {
        if (req.auth_info.isAdmin === true) {
        next();
    } else {
        return res.sendStatus(401);
    }
    })
}

/**
 * Registers an admin user.
 * @param {string} username 
 * @param {string} firstName 
 * @param {string} lastName 
 * @param {string} password
 * @return {success: bool, failure_reason: string}
 */
const registerAdminUser = async (username, firstName, lastName, password) => {
    if (typeof username != 'string' || typeof password != 'string' ||
        typeof firstName != 'string' || typeof lastName != 'string') {
        return {success: false, failure_reason: "Invalid args"};
    }
    // Check if password is valid (only for prod)
    if (isProd() && !checkPasswordRequirements(password)) {
        return {success: false, failure_reason: "Password didn't meet reqs"};
    }
    // Encrypt password
    const passwordHash = await bcrypt.hash(password, constants.PASSWORD_SALT_ROUNDS);
    // Store new user
    try {
        await agentDao.registerAdmin(username, firstName, lastName, passwordHash);
        return {success: true, failure_reason: ""};
    } catch(err) {
        if (isMongoDuplicateKeyError(err)) {
            return {success: false, failure_reason: "username already exists"};
        } else {
            return {success: false, failure_reason: err.toString()};
        }
    }
};

/**
 * Registers a temporary user with a random password
 * given {username: string, firstName: string, lastName: string}.
 * - Upon success, returns the random password.
 * - If input is invalid, returns 400
 * - If the username already exists, returns 409
 * - If anything else goes wrong, returns 500.
 */
router.post("/register_temp_user", isAdmin, async (req, res) => {
    const username = req.body.username;
    const firstName = req.body.firstName;
    const lastName = req.body.lastName;
    if (typeof username != "string" || typeof firstName != "string" || typeof lastName != "string") {
        return res.sendStatus(400);
    }
    // Generate random password
    const password = crypto.randomBytes(32).toString('hex');
    // Encrypt password
    const passwordHash = await bcrypt.hash(password, constants.PASSWORD_SALT_ROUNDS);
    try {
        // Store user in db
        await agentDao.registerAgent(username, firstName, lastName, passwordHash);
        return res.send({ password: password });
    } catch(err) {
        console.log(err)
        if (isMongoDuplicateKeyError(err)) {
            return res.sendStatus(409);
        }
        return res.sendStatus(500);
    }
});
module.exports = {
    registerAdminUser,
    router
}