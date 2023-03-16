// Enqueues users & assigns them to an online help desk agent w/ availability
const { RateLimiterMemory } = require('rate-limiter-flexible');
const {
  enqueue, pushToFrontOfQueue, userDisconnectedFromQueue, getOnlineAgentCount,
} = require('./queue');
const { io } = require('./queue_socketio');
const { verifyAndParseFrontOfQueueToken } = require('./queue_token_utils');
const { IP_ADDRESS_HEADER } = require('../constants');

const rateLimiter = new RateLimiterMemory({
  points: 10, // 10 handshakes
  duration: 60 * 10, // 10 minutes
});

io.on('connection', async (socket) => {
  // Disconnect if request is from an agent -- this is a user only service
  if (socket.auth_token) {
    socket.disconnect();
    return;
  }

  // Handle rate limiting
  rateLimiter.consume(socket.handshake.headers[IP_ADDRESS_HEADER], 1).catch(() => {
    socket.emit('429');
    socket.disconnect();
  });

  socket.on('disconnect', () => {
    if (socket.joinedQueue) {
      userDisconnectedFromQueue(socket);
    }
  });

  socket.on('join_queue', async (msg) => {
    if (typeof msg.token === 'string') {
      // Bypass token case
      const token = await verifyAndParseFrontOfQueueToken(msg.token);
      if (token) {
        // Use token info for socket params & push to front of queue
        socket.userId = token.userId;
        socket.firstName = token.firstName;
        socket.lastName = token.lastName;
        socket.joinedQueue = true;
        await pushToFrontOfQueue(socket);
      } else {
        // Invalid auth token
        socket.emit('bad_auth', {});
        socket.disconnect();
      }
    } else if (typeof msg.firstName === 'string' && typeof msg.lastName === 'string' && msg.firstName !== '' && msg.lastName !== '') {
      // Non-empty first name & last name case. Push params to socket & enqueue the user
      socket.firstName = msg.firstName;
      socket.lastName = msg.lastName;
      socket.joinedQueue = true;
      await enqueue(socket);
    }
    // If joining the queue failed, notify the user
    if (!socket.joinedQueue) {
      socket.emit('try_again', {});
      socket.disconnect();
    } else {
      // Notify user of # of online agents
      socket.emit('agents_online', getOnlineAgentCount());
    }
  });
});
