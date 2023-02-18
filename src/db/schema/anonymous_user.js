// Schema for anonymous chat users
const mongoose = require('mongoose');

const anonymousUserSchema = new mongoose.Schema({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    createdAt: { type: Number, required: true },
});

exports.anonymousUserSchema = anonymousUserSchema;