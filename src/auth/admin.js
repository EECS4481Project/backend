/**
 * Functions and endpoints for admin functionality.
 */
const bcrypt = require('bcrypt');
const express = require('express');
const { checkPasswordRequirements } = require('./utils');
const agentDao = require('../db/dao/agent_dao');
const { isMongoDuplicateKeyError, isProd } = require('../utils');
const constants = require('../constants');
// Only use dotenv (ie. .env) file in dev mode
// In prod, it should consume the real environment
if (!isProd()) {
    require('dotenv').config();
}

/**
 * Registers an admin user.
 * @param {string} username 
 * @param {string} firstName 
 * @param {string} lastName 
 * @param {string} password
 * @return {success: bool, failure_reason: string}
 */
const registerAdminUser = async (username, firstName, lastName, password) => {
    if (typeof username != 'string' || typeof password != 'string' ||
        typeof firstName != 'string' || typeof lastName != 'string') {
        return {success: false, failure_reason: "Invalid args"};
    }
    // Check if password is valid (only for prod)
    if (isProd() && !checkPasswordRequirements(password)) {
        return {success: false, failure_reason: "Password didn't meet reqs"};
    }
    // Encrypt password
    const passwordHash = await bcrypt.hash(password, constants.PASSWORD_SALT_ROUNDS);
    // Store new user
    try {
        await agentDao.registerAdmin(username, firstName, lastName, passwordHash);
        return {success: true, failure_reason: ""};
    } catch(err) {
        if (isMongoDuplicateKeyError(err)) {
            return {success: false, failure_reason: "username already exists"};
        } else {
            return {success: false, failure_reason: err.toString()};
        }
    }
};

module.exports = {
    registerAdminUser
}