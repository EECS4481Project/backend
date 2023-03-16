const mongoose = require('mongoose');
const constants = require('../../constants');

const queueTokenSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  tokenType: {
    type: String,
    enum: [constants.SKIP_QUEUE_TOKEN_NAME, constants.CHAT_QUEUE_TOKEN_NAME],
    required: true,
  },
  createdAt: { type: Date, required: true, default: Date.now },
});

queueTokenSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: constants.LIVE_CHAT_TOKEN_EXPIRY_SECONDS },
);

exports.queueTokenSchema = queueTokenSchema;
