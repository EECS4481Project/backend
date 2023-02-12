const express = require('express');
const helmet = require('helmet');
const bodyParser = require('body-parser');
const auth = require('./auth/auth');
const mongoose = require('./db/db_factory').mongoose
// Only use dotenv (ie. .env) file in dev mode
// In prod, it should consume the real environment
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const app = express();

// Set default security headers: https://www.npmjs.com/package/helmet
app.use(helmet());
// Required to parse JSON requests
app.use(bodyParser.json());
// Use auth module (ie. exposes all endpoints from the imported router to
// /auth endpoint)
app.use('/auth', auth.router);

// Health check to test that service is alive
app.get('/health_check', (req, res) => {
    res.sendStatus(200);
})

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