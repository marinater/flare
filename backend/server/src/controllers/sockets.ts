import type { Server as SocketServer } from 'socket.io'
import { DatabaseCodes, usersManager } from './data-store'
import { client as redisClient, makeRedisKey, vscodeSessionManager } from './sessions'

export interface SocketForwardedMessage {
	author: {
		id: string
		name: string
		pfp: string
	}
	messageID: string
	channelID: string
	guildID: string
	timestamp: string
	editedTimestamp: string
	content: string
}

export interface SocketInitInfo {}

export class SocketManager {
	makeSocketMapKey = makeRedisKey('socket_id_to_discord')
	io: SocketServer

	constructor(io: SocketServer, messageHandler: (discordID: string, data: SocketForwardedMessage) => void, guildsHandler: (discordID: string) => Promise<SocketInitInfo>) {
		this.io = io

		this.io.use(async (socket, next) => {
			const sessionID = (socket.handshake.auth as { sessionID?: string }).sessionID

			if (!sessionID || typeof sessionID !== 'string') {
				next(new Error('not authorized'))
				return
			}

			const githubUsername = await vscodeSessionManager.verify(sessionID)
			if (!githubUsername) {
				next(new Error('not authorized'))
				return
			}

			const discordID = await usersManager.getDiscordID(githubUsername)
			if (discordID === DatabaseCodes.Error || discordID === DatabaseCodes.NoSuchElement) {
				next(new Error('Discord ID not registered for the github username'))
				return
			}

			// @ts-ignore
			socket.discordID = discordID
			redisClient.SADD(this.makeSocketMapKey(discordID), socket.id, () => next())
		})

		this.io.on('connection', async socket => {
			socket.on('flare-user-guilds', async () => {
				console.log('AYAYAYA')
				const guildsList = await guildsHandler(socket.discordID)
				this.io.to(socket.id).emit('flare-user-guilds', guildsList)
			})

			socket.on('flare-message', (data: any) => messageHandler(socket.discordID, data))
		})
	}

	sendMessage = (discordID: string, messageType: string, message: SocketForwardedMessage) => {
		redisClient.SMEMBERS(this.makeSocketMapKey(discordID), (err, members) => {
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
