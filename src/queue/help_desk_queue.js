// Enqueues users & assigns them to an online help desk agent w/ availability
const { enqueue, pushToFrontOfQueue, userDisconnectedFromQueue } = require('./queue');
const { io } = require('./queue_socketio');
const { verifyAndParseFrontOfQueueToken } = require('./queue_token_utils');

io.on('connection', async (socket) => {
    // Disconnect if request is from an agent -- this is a user only service
    if (socket.auth_token) {
        socket.disconnect();
        return;
    }

    socket.on('disconnect', () => {
        if (socket.joinedQueue) {
            userDisconnectedFromQueue(socket);
        }
    });

    socket.on('ping', (msg) => {
        socket.emit('pong');
    })

    socket.on('join_queue', async (msg) => {
        if (typeof msg.token == 'string') {
            // Bypass token case
            const token = await verifyAndParseFrontOfQueueToken(msg.token);
            if (token) {
                // Use token info for socket params & push to front of queue
                socket.userId = token.userId;
                socket.firstName = token.firstName;
                socket.lastName = token.lastName;
                socket.joinedQueue = true;
                pushToFrontOfQueue(socket);
            } else {
                // Invalid auth token
                socket.emit('bad_auth', {});
                socket.disconnect();
            }
        } else if (typeof msg.firstName == 'string' && typeof msg.lastName == 'string' && msg.firstName !== "" && msg.lastName !== "") {
            // Non-empty first name & last name case. Push params to socket & enqueue the user
            socket.firstName = msg.firstName;
            socket.lastName = msg.lastName;
            socket.joinedQueue = true;
            enqueue(socket);
        }
        // If joining the queue failed, notify the user
        if (!socket.joinedQueue) {
            socket.emit('try_again', {});
            socket.disconnect();
        }
    })

    socket.on('test', msg => {
        socket.emit('pong')
    })
});