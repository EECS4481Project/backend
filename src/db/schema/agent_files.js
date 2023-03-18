// Schema for anonymous chat users
const mongoose = require('mongoose');
const aes256 = require('aes256');
const { isProd } = require('../../utils');
// Only use dotenv (ie. .env) file in dev mode
// In prod, it should consume the real environment
if (!isProd()) {
  require('dotenv').config();
}

const agentFilesSchema = new mongoose.Schema({
  file: { type: String, required: true }, // B64 strings that are encrypted
  fileName: { type: String, required: true },
  fileType: { type: String, required: true },
  senderUsername: { type: String, required: true },
  recipientUsername: { type: String, required: true },
});

// Handle encryption on save
agentFilesSchema.pre('save', function (next) {
  this.file = aes256.encrypt(process.env.FILE_STORAGE_ENCRYPTION_KEY, this.file);
  next();
});

// Handle decryption on get
agentFilesSchema.post('find', (res) => {
  if (!res) {
    return;
  }
  for (let i = 0; i < res.length; i++) {
    res[i].file = aes256.decrypt(process.env.FILE_STORAGE_ENCRYPTION_KEY, res[i].file);
  }
});

exports.agentFilesSchema = agentFilesSchema;
