module.exports = {
    PASSWORD_SALT_ROUNDS: 12,
    REFRESH_TOKEN_EXPIRY_SECONDS: 60 * 60 * 24 * 30, // 30 days
    AUTH_TOKEN_EXPIRY_SECONDS: (60 * 15), // 15 mins
    REFRESH_COOKIE_NAME: "refresh",
    AUTH_HEADER_NAME: "authorization",
    MAX_USERS_PER_AGENT: 5,
    LIVE_CHAT_TOKEN_EXPIRY_SECONDS: 20, // 20 seconds
    SKIP_QUEUE_TOKEN_NAME: 'SKIP',
    CHAT_QUEUE_TOKEN_NAME: 'CHAT',
    AGENT_MESSAGE_FETCH_LIMIT: 200,
    IP_ADDRESS_HEADER: 'x-real-ip'
}