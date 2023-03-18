const express = require('express');
const { isAgent } = require('../auth/utils');
const { getAgentFile } = require('../db/dao/agent_files_dao');
const { getPageOfMessagesBetweenUsers } = require('../db/dao/agent_messages_dao');

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
    const messages = await getPageOfMessagesBetweenUsers(
      req.auth_info.username,
      req.body.username,
      req.body.latestTimestamp,
    );
    res.send(messages);
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

/**
 * Downloads file of the given id if the user has access to it and it exists.
 * Otherwise returns 500 on error, or 400 on bad input.
 */
router.get('/agent-download/:id', isAgent, async (req, res) => {
  if (typeof req.params.id !== 'string' || req.params.id === '') {
    return res.sendStatus(400);
  }
  try {
    // Attempt to get file
    const file = await getAgentFile(req.params.id, req.auth_info.username);
    // Set headers for file download
    res.setHeader('Content-disposition', `attachment; filename=${file.fileName}`);
    res.setHeader('Content-type', file.fileType);
    // Write buffer of file to response
    res.writeHead(200).end(Buffer.from(file.file, 'base64'));
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

module.exports = {
  router,
};
