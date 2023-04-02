const express = require('express');
const http = require('http');
const helmet = require('helmet');
const constants = require('./constants');
const { lengthCheck } = require('./auth/utils');

// Main App
const app = express();
// Main Router
const router = express.Router();
// Main server
const server = http.createServer(app);

// Set default security headers: https://www.npmjs.com/package/helmet
app.use(helmet({
  contentSecurityPolicy: constants.WEBSOCKET_HEADERS_CSP,
}));

// Put all endpoints behind /api
app.use('/api', router);

//Check for length of inputs
app.use(lengthCheck);

module.exports = {
  router,
  server,
};
