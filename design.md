## Core features:

* Login/Registration/Logout System -- agents & admins
  * Agent should be set online/offline
  * Logging out should transfer all users back to queue (with their transcript)

* Anonymous user -> agent chat (probably using web sockets)
  * Users should be automatically assigned to agents

  * Possibly using a queue — or just assign to online agent with least clients

  * End chat button (for both agent & user)

  * Transfer user to another agent button (for agent)
    * Should pass transcript to new agent

  * Must show sender & client username for each message

* Agent -> agent chat (offline is possible) — probably using database

## APIs:

### Authentication: For agents & admins

* `login(username: string, password: string) -> auth_token`
  * Should have rate limiting or captcha
  * Upon success, it should mark the agent as online
* `register(token: string, password: string)` — Admin panel should have ability to send registration email
* `logout(auth_token)`

### Chat Start: For users

* `joinChatQueue(name: string) -> queue_token`
  * Name doesn’t have to be unique

  * Creates a unique token (queue_token) for the user and enqueues them
  * Should have rate limiting or captcha (ie. 3 queue joins per minute)
* `checkQueueStatus(queue_token) -> {int, int}` (users ahead of them & agents online)
  * Front end can call this every 10 seconds
  * Checks the users status in the queue
  * Should fail if token is invalid

* `startChat(queue_token) -> user_token`
  * Starts up the web socket chat with the agent
  * Returns a unique user_token to identify the user (as if they’re logged in)
  * This user_token can be a JWT that contains their name
  * Should run check to ensure the user has completed the queue on the backend (otherwise this can be abused) — ie. could call checkQueueStatus() to ensure 0 people ahead of them

### Chat: For users & agents

- `sendMessage(user_token, message)` — uses web socket
  * The sent message must include the name of the user who sent the message (so it can be displayed on the front end)
  * Should have rate limiting (ie. 3 messages per second)

* `endChat(user_token)` — ends web socket

### Agent endpoints: For use by agents only

* `startLiveChat(auth_token)` — Websocket to handle their live chats (ie. receive messages)
* `sendAgentMessage(agent_username, message)`
* `transferChat(user_token, agent_username)`
* `getAgentMessages(auth_token)` — can simply ping this every 10s
  * Webhooks wouldn’t be ideal for this as agents might want to communicate asynchronously (like email)



## Frontend:

* Login page
  * Calls login() and startLiveChat()

* Admin control panel
  * for registering/deleting agents — for security, admin accounts must be manually added/deleted from the database

* Home page (can just have start chat button, that asks for their name as input)
  * calls joinChatQueue() & redirects to queue page

* Waiting in queue page
  * calls checkQueueStatus() every 10s, and calls startChat() once complete. Redirects to user chat page once complete

* User chat page — simple text message looking screen with end chat button
  * Must include Sender & receivers name with each message. Might as well include timestamps too
  * Calls sendMessage() & possibly endChat()

* Agent dashboard
  * Chat page — text message screen with open chats on the side. Chats should all contain and end chat and transfer chat button
    * Calls sendMessage(), endChat() & transferChat()

  * Agent messages page — similar to chat page, but with a list of all the messages from agents
    * Calls sendAgentMessage() and getAgentMessages()


````json
auth_token: {

  name: str,

  username: str,

  timestamp: int

}
````

```json
queue_token: {

  name: str,

  timestamp: int

}
```

```json
user_token: {

  name: str,

  timestamp: int

}
```

### Notes:

* Auth token can be a JWT
* Sockets IO can be used to easily handle web sockets

### Technologies Mentioned:

Sockets IO: https://socket.io

JWT: [https://jwt.io](https://jwt.io/)