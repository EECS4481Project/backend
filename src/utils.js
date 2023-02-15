
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

module.exports = {
    getCurrentTimestamp,
    isMongoDuplicateKeyError,
    isProd
}