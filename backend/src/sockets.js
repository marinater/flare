const e = require('express')
const { usersManager } = require('./data-store')
const { vscodeSessionManager, redisClient, makeRedisKey } = require('./sessions')

const makeSocketMapKey = makeRedisKey('socket_id_to_discord')
const makeGuildMapKey = makeRedisKey('guild_map')

class SocketManager {
	constructor(io, messageHandler) {
		const sessionID = vscodeSessionManager.create('marinater')
		console.log(sessionID)

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

		this.io.on('connection', socket => {
			socket.on('flare-message', data => messageHandler(socket.discordID, data))
		})
	}

	sendMessage = (discordID, message) => {
		redisClient.SMEMBERS(makeSocketMapKey(discordID), (err, members) => {
			if (err) {
				console.error(`could not send message to ${discordID}: ${err.message}`)
				return
			}

			for (const member of members) {
				console.log(`sending message to ${discordID} (socketID: ${member})`)
				this.io.to(member).emit('flare-message', message)
			}
		})
	}
}

module.exports = { SocketManager }
