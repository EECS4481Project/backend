const mongoose = require('mongoose');
const { isProd } = require('../utils');
const { agentMessagesSchema } = require('./schema/agent_messages');
const { anonymousUserSchema } = require('./schema/anonymous_user');
const { queueTokenSchema } = require('./schema/queue_token');
const { refreshSecretSchema } = require('./schema/refresh_secret');
const agentSchema = require('./schema/agent').agentSchema;
if (!isProd()) {
    require('dotenv').config();
}

let connection = mongoose;

if (isProd()) {
    // TODO: Connect to prod db
    mongoose.connect(process.env.MONGO_DB_URL, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        auth: {
            username: process.env.MONGO_USERNAME,
            password: process.env.MONGO_PASSWORD,
        },
        dbName: "main"
    });
} else {
    // Connect to dev db
    mongoose.connect(process.env.MONGO_DB_URL, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    });
}

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'failed to connect to db:'));
db.once('open', function () {
    console.log('connected to mongodb');
});

// Add schemas to DB
const agent = connection.model('Agent', agentSchema);
const refreshSecret = connection.model('RefreshSecret', refreshSecretSchema);
const queueToken = connection.model('QueueToken', queueTokenSchema);
const anonymousUser = connection.model('AnonymousUser', anonymousUserSchema);
const agentMessages = connection.model('AgentMessages', agentMessagesSchema);

module.exports = {
    // Export dao's for use
    agent,
    refreshSecret,
    queueToken,
    anonymousUser,
    agentMessages,
    // Export mongoose for graceful disconnect later
    mongoose
};