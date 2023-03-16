// Creates the socket io object for the queue
const cookieParser = require('cookie-parser');
const { default: helmet } = require('helmet');
const { populateAgentInSocket } = require('../auth/utils');
const { server } = require('../server');

// eslint-disable-next-line import/order
const io = require('socket.io')(server, {
  path: '/api/start_queue',
});

// Set secure default headers
io.engine.use(helmet());
// Parse cookies
io.engine.use(cookieParser());

// Populate agent if found (so we can kick them)
io.use(populateAgentInSocket);

module.exports = {
  io,
};
