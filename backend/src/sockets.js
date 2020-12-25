const { usersManager } = require('./data-store')
const { vscodeSessionManager, redisClient, makeRedisKey } = require('./sessions')

const makeSocketMapKey = makeRedisKey('socket_id_to_discord')

class SocketManager {
	constructor(io, messageHandler, guildsHandler) {
		this.io = io

		this.io.use(async (socket, next) => {
			const sessionID = socket.handshake.auth.sessionID

			if (!sessionID) {
				next(new Error('not authorized'))
				return
			}

			const githubUsername = await vscodeSessionManager.verify(sessionID)
			if (!githubUsername) {
				next(new Error('not authorized'))
				return
			}

			const discordID = await usersManager.getDiscordID(githubUsername)
			if (!discordID) {
				next(new Error('Discord ID not registered for the github username'))
				return
			}

			socket.discordID = discordID
			redisClient.SADD(makeSocketMapKey(discordID), socket.id, () => next())
		})

		this.io.on('connection', async socket => {
			socket.on('flare-user-guilds', async () => {
				const guildsList = await guildsHandler(socket.discordID)
				this.io.to(socket.id).emit('flare-user-guilds', guildsList)
			})

			socket.on('flare-message', data => messageHandler(socket.discordID, data))
		})
	}

	sendMessage = (discordID, messageType, message) => {
		redisClient.SMEMBERS(makeSocketMapKey(discordID), (err, members) => {
			if (err) {
				console.error(`could not send message to ${discordID}: ${err.message}`)
				return
			}

			for (const member of members) {
				this.io.to(member).emit(messageType, message)
			}
		})
	}
}

module.exports = { SocketManager }
