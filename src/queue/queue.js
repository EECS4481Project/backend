// The core functionality for the queue
const constants = require("../constants");
const { generateLiveChatToken, generateFrontOfLineToken } = require('./queue_token_utils');
const { io } = require('./queue_socketio');
const { getUserById, addUser, updateUserChatSocketId } = require("../db/dao/anonymous_user_dao");

const queue = []; // socket ids
const availableAgents = {}; // username: available_spots
const unavailableAgents = new Set(); // unavailable but online
const overUtilizedAgents = {}; // username: overage -- for case where users are transferred to the agent
const agentToUserMapping = {}; // Used for handling the case where an agent signs off & we need to notify users -- stores user ids rather than socket ids
const agentToSocketMapping = {}; // For storing the agents socket (ie. to notify them when a user is assigned)
let availableAgentsIndex = 0;

let onlineAgentsCount = 0;

/**
 * Sets the agent as available in the queue & process the queue.
 * @param {string} username agent username
 * @param {socket} socket agents socket
 */
const setAgentOnline = async (username, socket) => {
    // Agent can't be online twice
    if (isAgentOnline(username)) {
        return;
    }
    // Set agent as available w/ MAX_USERS_PER_AGENT slots
    availableAgents[username] = constants.MAX_USERS_PER_AGENT;
    agentToUserMapping[username] = new Set();
    agentToSocketMapping[username] = socket;
    onlineAgentsCount += 1;
    await processQueue();
    // Notify clients of agent count
    io.emit('agents_online', onlineAgentsCount);
}

/**
 * Sets the agent as offline, and emits enqueue, along with a queue bypass
 * token to all of the agents current users.
 * @param {string} username agents username
 * @param {SocketIo} socketIo io object of chat
 */
const setAgentOffline = (username, socketIo) => {
    // Agent can't be offline if already offline
    if (!isAgentOnline(username)) {
        return;
    }
    // Get users assigned to the agent
    const users = agentToUserMapping[username];
    // Remove agent everywhere
    delete availableAgents[username];
    delete agentToUserMapping[username];
    delete agentToSocketMapping[username];
    unavailableAgents.delete(username);
    // Send users a queue skip token
    users.forEach(async (userId) => {
        try {
            const user = await getUserById(userId);
            const socket = socketIo.sockets.sockets.get(user.chatSocketId);
            // Verify user id is correct -- in case socket io set a dupe id (should never happen)
            if (socket && socket.user_info && socket.user_info.userId == userId) {
                socketIo.to(user.chatSocketId).emit('enqueue', {
                    token: await generateFrontOfLineToken(userId, user.firstName, user.lastName)
                });
            } else {
                socket.disconnect();
            }
        } catch(err) {
            console.error(err);
        }
    });
    // Notify clients of agent count
    onlineAgentsCount -= 1;
    io.emit('agents_online', onlineAgentsCount);
}

/**
 * Updates the database with the users current socket.
 * @param {string} userId 
 * @param {Socket} socket users socket
 */
const userJoinedChat = async (userId, socket) => {
    try {
        const updated = await updateUserChatSocketId(userId, socket.id);
        if (!updated) {
            socket.disconnect();
        }
    } catch (err) {
        socket.disconnect();
    }
}

/**
 * Creates space in the queue, and processes the queue.
 * @param {string} userId user id who left the chat
 * @param {string} agentUsername agent username that was serving the user
 */
const userDisconnectedFromChat = async (userId, agentUsername) => {
    // If agent is offline we can't do anything
    if (!isAgentOnline(agentUsername)) {
        return;
    }
    if (availableAgents.hasOwnProperty(agentUsername)) {
        availableAgents[agentUsername] += 1;
    } else if (overUtilizedAgents.hasOwnProperty(agentUsername)) {
        overUtilizedAgents[agentUsername] -= 1;
        // No longer over utilized
        if (overUtilizedAgents[agentUsername] == 0) {
            delete overUtilizedAgents[agentUsername];
        }
    } else {
        availableAgents[agentUsername] = 1;
        unavailableAgents.delete(agentUsername)
    }
    agentToUserMapping[agentUsername].delete(userId);
    await processQueue();
}

// TODO: Must be called upon transfer
/**
 * Assigns the user from originalAgentUsername to updatedAgentUsername.
 * We allow agents to be over-capacity when users are transferred.
 * @param {string} userId 
 * @param {string} originalAgentUsername 
 * @param {string} updatedAgentUsername 
 */
const userTransferredToAgent = async (userId, originalAgentUsername, updatedAgentUsername) => {
    // If agent is offline we can't do anything
    if (!isAgentOnline(updatedAgentUsername)) {
        return;
    }
    agentToUserMapping[updatedAgentUsername].add(userId);
    if (availableAgents.hasOwnProperty(updatedAgentUsername)) {
        availableAgents[updatedAgentUsername] -= 1;
        // Handle case where agent is no longer available
        if (availableAgents[updatedAgentUsername] == 0) {
            delete availableAgents[updatedAgentUsername];
            unavailableAgents.add(updatedAgentUsername);
        }
    } else if (!overUtilizedAgents.hasOwnProperty(updatedAgentUsername)) {
        // Case where agent is now over-utilized
        overUtilizedAgents[updatedAgentUsername] = 1;
    } else {
        // Case where agent is already over-utilized
        overUtilizedAgents[updatedAgentUsername] += 1;
    }
    // Remove user from original agent
    await userDisconnectedFromChat(userId, originalAgentUsername);
}

// Queue specific functionality

/**
 * Removes the user from the queue.
 * @param {Socket} socket users queue socket
 */
const userDisconnectedFromQueue = (socket) => {
    // TODO: This is very slow but fine for v0
    // We should use a different data structure for the queue
    // Remove user from queue
    const i = queue.indexOf(socket.id);
    if (i != -1) {
        queue.splice(i, 1);
    }
}

/**
 * Adds the user to the front of the queue
 * @param {string} socket users queue socket
 */
const pushToFrontOfQueue = async (socket) => {
    queue.unshift(socket.id);
    await processQueue();
}

/**
 * Adds the user to the end of the queue
 * @param {string} socket users queue socket
 */
const enqueue = async (socket) => {
    queue.push(socket.id);
    await processQueue();
}

/**
 * Removes as many users from the queue as possible and assigns them to agents,
 * while considering the agents max capacity.
 * Upon a user being assigned to an agent, they'll be added to the
 * anonymous user db, and 'done' will be emitted along with their
 * 1 time use chat access token.
 */
const processQueue = async () => {
    while (queue.length > 0) {
        const agentKeys = Object.keys(availableAgents);
        if (agentKeys.length > 0) {
            // Get socketId & socket from queue
            const socketId = queue.shift();
            const socket = io.sockets.sockets.get(socketId);
            // Only proceed if the socket was found (ie. to avoid race condition where user disconnected)
            if (!socket) {
                break;
            }
            // Update availableAgentsIndex to (somewhat) evenly distribute users
            availableAgentsIndex += 1;
            if (availableAgentsIndex >= agentKeys.length) {
                availableAgentsIndex = 0;
            }
            const agentUsername = agentKeys[availableAgentsIndex];
            // Remove 1 availability from agent
            availableAgents[agentUsername] -= 1;
            // Handle case where agent is now full
            if (availableAgents[agentUsername] == 0) {
                delete availableAgents[agentUsername];
                unavailableAgents.add(agentUsername);
            }
            if (socket.userId) {
                // Assign user to agent
               await assignUserToAgent(socket.userId, agentUsername, socket);
            } else {
                try {
                    const userId = await addUser("", socket.firstName, socket.lastName);
                    await assignUserToAgent(userId, agentUsername, socket);
                } catch(err) {
                    console.error(err);
                    // Failed to user -- revert changes (passing empty userId)
                    userDisconnectedFromChat("", agentUsername);
                }
            }
        } else {
            return; // All agents are busy
        }
    }
}

// Utils

/**
 * Assigns a user to the given agent, and returns a 1 time use chat access
 * token via emitting 'done' w/ {token: str}.
 * @param {string} userId users id, as stored in anonymous user db (not socket id)
 * @param {string} agentUsername the agent to assign the user to
 * @param {Socket} socket the users queue socket
 */
const assignUserToAgent = async (userId, agentUsername, socket) => {
    // Map user to agent
    agentToUserMapping[agentUsername].add(userId);
    // Emit token to user
    try {
        // TODO: User could go through queue, and then not join the chat.
        // This would cause the chat to be full while the users have no agents.
        // To fix this, we should run a method 20 seconds after they were granted permission
        // & check if the anonymousUser.chatSocketId was set
        const jwt = await generateLiveChatToken(userId, socket.firstName, socket.lastName, agentUsername);
        // Notify agent of assignment
        agentToSocketMapping[agentUsername].emit('assigned_user', {
            userId: userId,
            firstName: socket.firstName,
            lastName: socket.lastName
        });
        // Notify user of assignment
        socket.emit('done', { token: jwt })
        socket.disconnect();
    } catch (err) {
        console.log(err)
        // Failed to add user, revert the above
        userDisconnectedFromChat(userId, agentUsername);
    }
}

/**
 * Checks if the given agents username is online in the chat.
 * @param {string} username agents username
 * @returns true if the given username is online, false otherwise
 */
const isAgentOnline = (username) => {
    return availableAgents.hasOwnProperty(username) || unavailableAgents.has(username)
}

/**
 * Get the number of agents online
 * @returns number of agents online
 */
const getOnlineAgentCount = () => {
    return onlineAgentsCount;
}

/**
 * Gets the chat socket for the given agent username
 * @param {string} username agents username
 * @returns socket if found, null otherwise
 */
const getSocketForAgent = (username) => {
    if (isAgentOnline(username)) {
        return agentToSocketMapping[username];
    }
    return null;
}

module.exports = {
    setAgentOnline,
    setAgentOffline,
    userDisconnectedFromChat,
    userTransferredToAgent,
    userDisconnectedFromQueue,
    pushToFrontOfQueue,
    enqueue,
    userJoinedChat,
    getOnlineAgentCount,
    getSocketForAgent
}