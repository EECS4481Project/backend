const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');

const { router, server } = require('./server');
const auth = require('./auth/auth');
const admin = require('./auth/admin');
const helpDeskMessagingHttp = require('./help_desk/help_desk_messaging_http');
const queue = require('./queue/help_desk_queue');
const liveChat = require('./chat/live_chat');
const agentMessaging = require('./help_desk/help_desk_messaging');

const { isProd } = require('./utils');
const mongoose = require('./db/db_factory').mongoose

// Only use dotenv (ie. .env) file in dev mode
// In prod, it should consume the real environment
if (!isProd()) {
    require('dotenv').config();
    // Create default admin user in dev env
    admin.registerAdminUser(process.env.ADMIN_USER_USERNAME,
        process.env.ADMIN_USER_FIRST_NAME, process.env.ADMIN_USER_LAST_NAME,
        process.env.ADMIN_USER_PASSWORD).then(res => {
            if (res.success && res.failure_reason != "username already exists") {
                console.log("failed to create default admin user", res.failure_reason);
            }
        });
}

// Required to parse cookies
router.use(cookieParser());
// Required to parse JSON requests
router.use(bodyParser.json());
// Add endpoints from other routers
router.use('/auth', auth.router);
router.use('/admin', admin.router);
router.use('/help_desk_messaging', helpDeskMessagingHttp.router);

// Health check to test that service is alive
router.get('/health_check', (req, res) => {
    res.sendStatus(200);
})

// Listen on port from environment variable
server.listen(process.env.PORT, () => {
    console.log(`Listening on port ${process.env.PORT}`);
})

// Gracefully disconnect from mongodb
process.on('SIGINT', function () {
    mongoose.disconnect();
    process.exit(0)
})