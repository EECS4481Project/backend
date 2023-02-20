const { isAgent } = require("../auth/auth");
const express = require('express');
const { getPageOfMessagesBetweenUsers } = require("../db/dao/agent_messages_dao");
const router = express.Router();

/**
 * Returns a chat page between the current user and the given username,
 * based on the given timestamp.
 */
router.post('/chat_page_with_username', isAgent, async (req, res) => {
    try {
        if (typeof req.body.username !== 'string' || typeof req.body.latestTimestamp !== 'number') {
            return res.sendStatus(400);
        }
        const messages = await getPageOfMessagesBetweenUsers(req.auth_info.username, req.body.username, req.body.latestTimestamp);
        res.send(messages);
    } catch (err) {
        console.error(err);
        res.sendStatus(500);
    }
})

module.exports = {
    router
}