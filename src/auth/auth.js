// Authentication functionality for help desk users
const express = require('express');
const bcrypt = require('bcrypt');

const router = express.Router();
const rateLimit = require('express-rate-limit');
const agentDao = require('../db/dao/agent_dao');
const { setNewAuthAndRefreshToken } = require('./token_utils');

const rateLimiter = rateLimit({
	windowMs: 10 * 60 * 1000, // 10 minutes
	max: 10, // Limit each IP to max per `window`
	standardHeaders: false, // Disable the `RateLimit-*` headers
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

/**
 * When used as middleware, proceeds if request is from a signed in agent.
 * Returns 401 status code otherwise.
 * Will also handle refreshing the users credentials.
 * Usage: router.get('/some_endpoint', isAgent, (req, res) => {...})
 * @param {*} req Request
 * @param {*} res Resolve
 * @param {*} next Callback to next request
 */
const isAgent = async (req, res, next) => {
    // TODO: Return 401 if not signed in
    next();
}

/**
 * When used as middleware, populates req.agent_name and proceeds.
 * If no agent_name is found, req.agent_name will be null.
 * @param {Request} req 
 * @param {Response} res 
 * @param {NextFunction} next 
 */
const getName = async (req, res, next) => {
    // TODO: Parse JWT
    next();
}

/**
 * Returns a 200 status code if the user is signed in. Returns a 401 status code
 * otherwise.
 */
router.get('/is_logged_in', isAgent, (req, res) => {
    res.sendStatus(200);
});

/**
 * Given a json of { username: string, password: string } attempts to log in.
 * If successful, returns the following cookies:
 *   - HttpOnly REFRESH -- long lived cookie for obtaining a new AUTH token
 *   - AUTH -- short lived authentication cookie
 * If given invalid credentials, or invalid input returns 400.
 * If too many calls were made by the given IP, it will rate limit them
 * returning 429.
 * Returns 500 if there's an internal error.
 */
router.post('/login', rateLimiter, async (req, res) => {
    const username = req.body.username;
    const password = req.body.password;
    if (typeof username != 'string' || typeof password != 'string') {
        return res.sendStatus(400);
    }
    try {
        const agent = await agentDao.getAgentByUsername(username);
        // User not found case
        if (agent == null) {
            return res.sendStatus(400);
        }
        // Compare password
        const isPasswordEqual = await bcrypt.compare(password, agent.password);
        if (!isPasswordEqual) {
            return res.sendStatus(400);
        }
        // Username & password are valid, return auth info
        await setNewAuthAndRefreshToken(agent, res);
        return res.sendStatus(200);
    } catch(err) {
        // Error case
        return res.sendStatus(500);
    }

});

router.post('/register', rateLimiter, async (req, res) => {
    // TODO: Register temp user
});

router.post('/change_password', async (req, res) => {
    // NOTE: Must take current password as param
})



// Login:
// Returns Access Token in body
// Returns Refresh Token as HTTPOnly

// isAgent() will handle refreshing


exports.router = router;
exports.isAgent = isAgent;
exports.getName = getName;