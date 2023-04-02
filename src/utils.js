const constants = require('./constants');
const { IP_ADDRESS_HEADER } = require('./constants');

const allowedFileTypes = [
  'image',
  'video',
  'application/pdf',
];

/*
Sets secure headers on websocket.
*/
const webSocketSetSecureHeaders = (headers) => {
  headers['Content-Security-Policy'] = constants.WEBSOCKET_HEADERS_CSP;
  headers['Strict-Transport-Security'] = constants.WEBSOCKET_HEADERS_STS;
};

/**
 * Returns true if the given mimetype is allowed, and the file extension
 * matches the mimetype. False otherwise.
 * @param {string} mime file mimetype
 * @param {string} fileName file name
 * @returns true if allowed, false otherwise.
 */
const validateFileType = (mime, fileName) => {
  for (let i = 0; i < allowedFileTypes.length; i++) {
    if (mime.startsWith(allowedFileTypes[i]) || mime === allowedFileTypes[i]) {
      const splitMime = mime.split('/');
      // Return true if file extension matches mimetype
      return fileName.endsWith(splitMime[splitMime.length - 1]);
    }
  }
  return false;
};

/**
 * Get the current timestamp in UTC.
 * @returns Timestamp
 */
const getCurrentTimestamp = () => {
  return Math.floor(Date.now() / 1000);
};

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
};

/**
 * Returns true if this is running in a prod environment.
 */
const isProd = () => {
  return process.env.NODE_ENV === 'production';
};

/**
 * Get the clients IP address (set by fly.io)
 * @param {Request} req
 * @returns
 */
const getIpAddress = (req) => {
  return req.headers[IP_ADDRESS_HEADER];
};

/**
 * Returns a 400 if any of the req.body string inputs are over
 * MAX_EXPRESS_JSON_FIELD_LENGTH chars. Proceeds otherwise.
 * To be used as express middleware.
 * Only supports JSON.
 * Note: Doesn't support nested JSONs or lists, as these aren't valid inputs.
 * @param {Request} req request
 * @param {Response} res response
 * @param {NextFunction} next next
 */
const jsonInputMaxStringLengthCheck = async (req, res, next) => {
  // Skip if non-json
  if (typeof req.body !== 'object') {
    return next();
  }
  // Proceed
  const data = Object.values(req.body);
  // Check that each value length is less than max input length
  for (let i = 0; i < data.length; i++) {
    if (typeof data[i] === 'string'
          && data[i].length > constants.MAX_EXPRESS_JSON_FIELD_LENGTH) {
      return res.sendStatus(400);
    }
  }
  return next();
};

/**
 * Returns if the string input (or any string values in the JSON)
 * are over MAX_SOCKET_JSON_FIELD_LENGTH length. Proceeds otherwise.
 * To be used as socket io middleware.
 * Note: Doesn't support nested JSONs or lists, as these aren't valid inputs.
 * @param {packet} packet socket io middleware packet
 * @param {NextFunction} next next
 */
const maxStringInputLengthCheckSocketMiddleware = async (packet, next) => {
  if (packet && packet.length === 2) {
    if (typeof packet[1] === 'object') {
      // JSON case, check each input
      const data = Object.values(packet[1]);
      // Check that each value length is less than max input length
      for (let i = 0; i < data.length; i++) {
        if (typeof data[i] === 'string'
              && data[i].length > constants.MAX_SOCKET_JSON_FIELD_LENGTH) {
          return null;
        }
      }
    } else if (typeof packet[1] === 'string') {
      // String case
      if (packet[1].length > constants.MAX_SOCKET_JSON_FIELD_LENGTH) {
        return null;
      }
    }
  }
  return next();
};

module.exports = {
  getCurrentTimestamp,
  isMongoDuplicateKeyError,
  isProd,
  getIpAddress,
  validateFileType,
  webSocketSetSecureHeaders,
  jsonInputMaxStringLengthCheck,
  maxStringInputLengthCheckSocketMiddleware,
};
