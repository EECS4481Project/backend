// Agent schema -- users who sign in/register.
const mongoose = require('mongoose');

const agentMessagesSchema = new mongoose.Schema({
  senderUsername: { type: String, required: true },
  receiverUsername: { type: String, required: true },
  message: { type: String, required: true },
  timestamp: { type: Number, required: true, index: true },
});

exports.agentMessagesSchema = agentMessagesSchema;
