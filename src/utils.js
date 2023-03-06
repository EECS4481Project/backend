const { IP_ADDRESS_HEADER } = require("./constants");

/**
 * Get the current timestamp in UTC.
 * @returns Timestamp
 */
const getCurrentTimestamp = () => {
    return Math.floor(Date.now() / 1000);
}

/**
 * Given an error, returns true if it's a duplicate key error.
 * @param {Error} err 
 * @returns true if the given err is a duplicate key error, false otherwise.
 */
const isMongoDuplicateKeyError = (err) => {
    if (err.name === 'MongoServerError' && err.code === 11000) {
        return true;
    }
    return false;
}

/**
 * Returns true if this is running in a prod environment.
 */
const isProd = () => {
    return process.env.NODE_ENV === 'production';
}

/**
 * Get the clients IP address (set by fly.io)
 * @param {Request} req 
 * @returns 
 */
const getIpAddress = (req) => {
    return req.headers[IP_ADDRESS_HEADER];
}

module.exports = {
    getCurrentTimestamp,
    isMongoDuplicateKeyError,
    isProd,
    getIpAddress
}