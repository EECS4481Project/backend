// Agent schema -- users who sign in/register.
const mongoose = require('mongoose');

const agentSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true, index: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    password: { type: String, required: true},
    isAdmin: { type: Boolean, required: true, default: false },
    isRegistered: { type: Boolean, required: true, default: false }, // Flag for newly registered user who hasn't yet set their password
    isDeleted: { type: Boolean, required: true, default: false }, // Flag for deleting users.
    createdAt: { type: Number, required: true },
});

exports.agentSchema = agentSchema;