const mongoose = require('mongoose');
const constants = require('../../constants');

const refreshSecretSchema = new mongoose.Schema({
    secret: { type: String, required: true, unique: true },
    createdAt: { type: Date, expires: constants.REFRESH_TOKEN_EXPIRY_SECONDS, default: Date.now }
});

exports.refreshSecretSchema = refreshSecretSchema;