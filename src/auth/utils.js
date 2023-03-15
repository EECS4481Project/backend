const cookie = require('cookie');
const { Socket } = require('socket.io');
const { REFRESH_COOKIE_NAME, AUTH_HEADER_NAME } = require('../constants');

const { getCurrentTimestamp } = require("../utils");
const { getJsonAuthTokenIfValid, getJsonRefreshTokenIfValid, setRefreshedAuthAndRefreshToken } = require("./token_utils");

/**
 * Returns true if a given password meets the requirements. False otherwise.
 * - \>= 8 characters
 * - Contains 1+ lowercase
 * - Contains 1+ uppercase
 * - Contains 1+ number
 * - Contains 1+ symbols
 * @param {string} password password to verify
 * @return true if a given password meets the requirements. False otherwise.
 */
const checkPasswordRequirements = (password) => {
    lowercaseCount = 0;
    uppercaseCount = 0;
    numberCount = 0;
    symbolCount = 0;
    for (var i = 0; i < password.length; i++) {
        if (password.charCodeAt(i) >= 'a'.charCodeAt(0)
            && password.charCodeAt(i) <= 'z'.charCodeAt(0)) {
            lowercaseCount += 1;
        } else if (password.charCodeAt(i) >= 'A'.charCodeAt(0)
            && password.charCodeAt(i) <= 'Z'.charCodeAt(0)) {
            uppercaseCount += 1;
        } else if (password.charCodeAt(i) >= '0'.charCodeAt(0)
            && password.charCodeAt(i) <= '9'.charCodeAt(0)) {
            numberCount += 1;
        } else {
            symbolCount += 1;
        }
    }
    return lowercaseCount >= 1 && uppercaseCount >= 1 && numberCount >= 1
        && symbolCount >= 1 && password.length >= 8;
}

/**
 * ONLY TO BE USED AS SOCKET IO MIDDLEWARE.
 * ie. io.use(populateAgentInSocket);
 * When used as middleware, proceeds if a handshake is from a signed in agent
 * and sets socket.auth_token to the agents info.
 * Disconnects otherwise.
 * @param {Socket} socket 
 * @param {next} next
 */
const agentOnlySocket = async (socket, next) => {
    // TODO: (security) We don't refresh the token during the socket
    // So if an auth token was stolen, they could use it to permanently stay
    // in the hcat
    let cookies = {};
    let auth = "";
    if (socket.handshake.headers.cookie && socket.handshake.headers[AUTH_HEADER_NAME]) {
        cookies = cookie.parse(socket.handshake.headers.cookie);
        auth = socket.handshake.headers[AUTH_HEADER_NAME];
    } else {
        return next(Error("auth"));
    }
    const user = await getJsonAuthTokenIfValid(auth);
    if (!user || user.exp < getCurrentTimestamp()) {
        return next(Error("auth"));
    }
    socket.auth_token = user;
    next();
}

/**
 * ONLY TO BE USED AS SOCKET IO MIDDLEWARE.
 * ie. io.use(populateAgentInSocket);
 * When used as middleware, proceeds if a handshake is from a signed in agent
 * and sets socket.auth_token to the agents info.
 * socket.auth_token will be null if a non-agent.
 * @param {socket} socket 
 * @param {next} next
 */
const populateAgentInSocket = async (socket, next) => {
    // TODO: (security) We don't refresh the token during the socket
    // So if an auth token was stolen, they could use it to permanently stay
    // in the chat
    let cookies = {};
    let auth = "";
    if (socket.handshake.headers.cookie && socket.handshake.headers[AUTH_HEADER_NAME]) {
        cookies = cookie.parse(socket.handshake.headers.cookie);
        auth = socket.handshake.headers[AUTH_HEADER_NAME];
    }
    const user = await getJsonAuthTokenIfValid(auth);
    if (user) {
        socket.auth_token = user;
    }
    next();
}

/**
 * ONLY TO BE USED AS HTTP REQUEST MIDDLEWARE.
 * When used as middleware, proceeds if request is from a signed in agent.
 * Also sets req.auth_info & req.refresh_info
 * Returns 401 status code otherwise.
 * Will also handle refreshing the users credentials.
 * ie. might return an Authorization header with the new auth token.
 * Usage: router.get('/some_endpoint', isAgent, (req, res) => {...})
 * @param {Request} req Request
 * @param {*} res Resolve
 * @param {*} next Callback to next request
 */
const isAgent = async (req, res, next) => {
    if (!req.cookies || !req.headers[AUTH_HEADER_NAME]) {
        return res.sendStatus(401);
    }
    const auth = await getJsonAuthTokenIfValid(req.headers[AUTH_HEADER_NAME]);
    const refresh = await getJsonRefreshTokenIfValid(req.cookies[REFRESH_COOKIE_NAME]);
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

module.exports = {
    checkPasswordRequirements,
    agentOnlySocket,
    populateAgentInSocket,
    isAgent
}