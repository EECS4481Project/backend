const mongoose = require('mongoose');
const constants = require('../../constants');

const refreshSecretSchema = new mongoose.Schema({
  username: { type: String, required: true },
  secret: { type: String, required: true, unique: true },
  createdAt: { type: Date, required: true, default: Date.now },
});

refreshSecretSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: constants.REFRESH_TOKEN_EXPIRY_SECONDS },
);

exports.refreshSecretSchema = refreshSecretSchema;
