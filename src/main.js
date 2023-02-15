const express = require('express');
const helmet = require('helmet');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');

const auth = require('./auth/auth');
const admin = require('./auth/admin');

const { isProd } = require('./utils');
const { Router } = require('express');
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

const app = express();
const router = Router();

// Set default security headers: https://www.npmjs.com/package/helmet
app.use(helmet());
// Required to parse cookies
router.use(cookieParser());
// Required to parse JSON requests
router.use(bodyParser.json());
// Use auth module (ie. exposes all endpoints from the imported router to
// /auth endpoint)
router.use('/auth', auth.router);
router.use('/admin', admin.router);

// Health check to test that service is alive
router.get('/health_check', (req, res) => {
    res.sendStatus(200);
})

// Put all endpoints behind /api
app.use('/api', router);

// Listen on port from environment variable
app.listen(process.env.PORT, () => {
    console.log(`Listening on port ${process.env.PORT}`);
})

// Gracefully disconnect from mongodb
process.on('SIGINT', function () {
    mongoose.disconnect();
    process.exit(0)
})

exports.app = app;