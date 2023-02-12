// Authentication functionality for help desk users
// Login -- JWT? -- includes role & username

// Registration -- requires the registration token & password

// isAdmin(jwt)
// isAgent(jwt)

const express = require('express');

const router = express.Router();

router.post('/login', async (req, res) => {
    const username = req.body.username;
    res.send(username);
});


exports.router = router;