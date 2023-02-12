const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    fistName: { type: String, required: true },
    lastName: { type: String, required: true },
    password: { type: String, required: true},
    createdAt: { type: Number },
});

exports.userSchema = userSchema;