module.exports = {
  PASSWORD_SALT_ROUNDS: 12,
  REFRESH_TOKEN_EXPIRY_SECONDS: 60 * 60 * 24 * 30, // 30 days
  AUTH_TOKEN_EXPIRY_SECONDS: (60 * 15), // 15 mins
  REFRESH_COOKIE_NAME: 'refresh',
  AUTH_HEADER_NAME: 'authorization',
  MAX_USERS_PER_AGENT: 5,
  LIVE_CHAT_TOKEN_EXPIRY_SECONDS: 20, // 20 seconds
  SKIP_QUEUE_TOKEN_NAME: 'SKIP',
  CHAT_QUEUE_TOKEN_NAME: 'CHAT',
  AGENT_MESSAGE_FETCH_LIMIT: 200,
  IP_ADDRESS_HEADER: 'x-real-ip',
  USER_FILES_DOCUMENT_NAME: 'UserFiles',
  WEBSOCKET_HEADERS_CSP: "base-uri 'self'; default-src 'none'; style-src 'self' 'sha256-47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU='; script-src 'self'; img-src 'self'; media-src 'none'; font-src 'none'; connect-src 'self'; worker-src 'none'; frame-src 'none'; form-action 'self'; manifest-src 'self'; frame-ancestors 'none'",
  WEBSOCKET_HEADERS_STS: 'max-age=31536000; includeSubDomains',
};
