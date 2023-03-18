// Schema for anonymous chat users
const mongoose = require('mongoose');
const { USER_FILES_DOCUMENT_NAME } = require('../../constants');

const anonymousUserSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  createdAt: { type: Number, required: true },
  messages: [
    {
      message: { type: String, required: true },
      correspondentUsername: { type: String, required: true },
      isFromUser: { type: Boolean, required: true },
      timestamp: { type: Number, required: true, index: true },
      file: { type: mongoose.Schema.Types.ObjectId, ref: USER_FILES_DOCUMENT_NAME },
      _id: false,
    },
  ],
});

exports.anonymousUserSchema = anonymousUserSchema;
