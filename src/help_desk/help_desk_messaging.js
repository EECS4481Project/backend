// Handles messaging between agents -- probably just store messages in a database
// so they can send messages to each other while offline

// Some boiler plate for agent only connection

const cookieParser = require('cookie-parser');
const { default: helmet } = require('helmet');
const { agentOnlySocket } = require('../auth/auth');
const { server } = require('../server');
const io = require("socket.io")(server, {
    path: "/api/start_messaging"
});

// Set secure default headers
io.engine.use(helmet());
// Parse cookies
io.engine.use(cookieParser());
// Ensure only agents can initialize the connection (not fully secure, but fine for v0)
io.use(agentOnlySocket);

io.on('connection', async (socket) => {
    // socket.auth_token will give us the info for the current agent
    console.log(socket.auth_token)
    socket.on('disconnect', () => {
        console.log('user disconnected', socket.id);
    });

    socket.on('ping', () => {
        socket.emit('pong');
    })
});