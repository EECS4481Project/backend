// helper class for live_chat functionality relating to queues
const { Socket } = require('socket.io');
const { setAgentOnline, setAgentOffline, userJoinedChat, userDisconnectedFromChat } = require('../queue/queue');
const { verifyAndParseLiveChatToken } = require('../queue/queue_token_utils');

/**
 * Sets the agent as available to chat and alerts the queue.
 * @param {Socket} socket 
 */
const handleAgentLogin = async (socket) => {
    // Add agent to chat queue
    try {
        await setAgentOnline(socket.auth_token.username, socket);
    } catch (err) {
        socket.disconnect();
    }
}

/**
 * Populates the user with their required info (user_info & user_agent_info)
 * and proceeds.
 * If their 1 time use token isn't valid, emit "auth_failed" and dc.
 * @param {Socket} socket 
 * @param {JSON} msg message containing token
 */
const handleUserLogin = async (socket, msg) => {
    if (typeof msg.token == 'string') {
        const token = await verifyAndParseLiveChatToken(msg.token);
        if (token) {
            // Populate socket with required data
            socket.user_info = {
                userId: token.userId,
                firstName: token.firstName,
                lastName: token.lastName
            }
            socket.user_agent_info = {
                username: token.agentUsername
            }
            await userJoinedChat(token.userId, socket);
            return;
        }
    }
    // If auth failed, alert them & dc
    socket.emit("auth_failed", {});
    socket.disconnect();
}

/**
 * Marks the agent as offline, notifies the queue that capacity has been
 * reduced, and emits to all of the users they were chatting with:
 * ('enqueue', {token: string}) -- this token can be passed
 * to join_queue to skip to the front of the queue.
 * @param {Socket} socket 
 * @param {socketIO} socketIO IO obj for chat socket.
 */
const handleAgentDisconnect = async (socket, socketIO) => {
    try {
        setAgentOffline(socket.auth_token.username, socketIO);
    } catch (err) {}
}

/**
 * Notifies the queue that a space has became available.
 * @param {Socket} socket 
 */
const handleUserDisconnect = async (socket) => {
    // Free up spot in queue
    if (socket.user_info) {
        await userDisconnectedFromChat(socket.user_info.userId, socket.user_agent_info.username);
    }
}

module.exports = {
    handleAgentLogin,
    handleUserLogin,
    handleAgentDisconnect,
    handleUserDisconnect
}