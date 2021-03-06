import type { Server as SocketServer, Socket } from 'socket.io'
import { ExtendedError } from 'socket.io/dist/namespace'
import { DatabaseCodes, usersManager } from './data-store'
import { vscodeSessionManager } from './sessions'

const makeGuildKey = (guildID: string) => `guild:${guildID}`
const makeChannelKey = (channelID: string) => `channel:${channelID}`
const makeUserKey = (discordID: string) => `discordID:${discordID}`

interface SocketAttachment {
	id: string
	name: string | null
	url: string
	height: number | null
	width: number | null
}

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
	editedTimestamp: string | null
	content: string
	attachments: SocketAttachment[]
}

// !!!! DON'T WITHOUT FIXING VALIDATE_MESSAGE_POST !!!!
export interface SocketPushMessage {
	discordID: string
	guildID: string
	channelID: string
	content: string
}
// !!!! DON'T WITHOUT FIXING VALIDATE_MESSAGE_POST !!!!

interface ChannelInfo {
	id: string
	name: string
}

export interface GuildInfo {
	id: string
	name: string
	icon: string | null
	channels: ChannelInfo[]
	members: {
		nickname: string | null
		displayName: string
		id: string
	}[]
}

export interface SocketInitInfo {
	guilds: GuildInfo[]
	discordID: string
	patterns: {
		user: string
		everyone: string
	}
}

export interface SocketMessageFetch {
	guildID: string
	channelID: string
	discordID: string
	limit: number
	before?: string
}

export interface SocketMessageFetchResponse {
	messages: SocketForwardedMessage[]
	complete: boolean
}

// FUNCTIONS INITITATED FROM VSCODE
// post message to discord
// get init info
// get previous messages
export interface SocketHooks {
	onSocketInit: (discordID: string) => Promise<SocketInitInfo>
	onMessagePost: (
		data: SocketPushMessage
	) => Promise<{ success: true } | { success: false; message: string }>
	onMessageFetch: (
		data: SocketMessageFetch
	) => Promise<SocketMessageFetchResponse>
}

export class SocketManager {
	private readonly io: SocketServer
	private readonly hooks: SocketHooks

	constructor(io: SocketServer, hooks: SocketHooks) {
		this.io = io
		this.hooks = hooks
		io.use(this.authenticateSocket)
		io.on('connection', this.onConnection)
	}

	authenticateSocket = async (
		socket: Socket,
		next: (err?: ExtendedError | undefined) => void
	) => {
		// @ts-ignore
		const sessionID = socket.handshake.auth.sessionID as any | undefined

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
		if (
			discordID === DatabaseCodes.Error ||
			discordID === DatabaseCodes.NoSuchElement
		) {
			next(new Error('Discord ID not registered for the github username'))
			return
		}

		// @ts-ignore
		socket.discordID = discordID
		next()
	}

	onConnection = async (socket: Socket) => {
		// @ts-ignore
		const discordID = socket.discordID

		socket.on('socket-init', async (callback) => {
			const socketInfo = await this.hooks.onSocketInit(discordID)
			socket.emit('socket-init', socketInfo)

			for (const guild of socketInfo.guilds) {
				socket.join(makeGuildKey(guild.id))

				for (const channel of guild.channels) {
					socket.join(makeChannelKey(channel.id))
				}
			}

			callback(socketInfo)
		})

		socket.on('message-post', (dataUnknown: any) => {
			if (!this.validateMessagePost(dataUnknown)) return
			const data = dataUnknown as {
				channelID: string
				content: string
				guildID: string
			}
			return this.hooks.onMessagePost({ discordID, ...data })
		})

		socket.on('message-fetch', async (dataUnknown: any, callback) => {
			if (!this.validateMessageFetch(dataUnknown))
				callback({ messages: [], complete: false })

			const data = dataUnknown as {
				guildID: string
				channelID: string
				limit: number
				before?: string
			}

			const messages = await this.hooks.onMessageFetch({
				discordID,
				...data,
			})

			return callback(messages)
		})
	}

	validateMessagePost = (data: any) => {
		return (
			Object.keys(data).length === 3 &&
			typeof data.channelID === 'string' &&
			typeof data.content === 'string' &&
			typeof data.guildID === 'string'
		)
	}

	validateMessageFetch = (data: any) => {
		return (
			(Object.keys(data).length === 3 ||
				Object.keys(data).length === 4) &&
			typeof data.guildID === 'string' &&
			typeof data.channelID === 'string' &&
			typeof data.limit === 'number' &&
			(typeof data.before === 'undefined' ||
				(data.before && typeof data.before === 'string'))
		)
	}

	// FUNCTIONS INITIATED BY BACKEND
	// typing indicator
	// forward discord message
	// message edit   => multiple users
	// channel create => multiple users
	// guild create   => multiple users
	// channel delete => multiple users
	// guild delete   => multplue users
	// channel kick   => single user
	// guild kick     => single user

	forwardTypingIndicator = (discordUsername: string, channelID: string) => {}
	forwardMessageEdit = (message: SocketForwardedMessage) => {}
	forwardMessage = (message: SocketForwardedMessage) => {
		this.io
			.to(makeChannelKey(message.channelID))
			.emit('forward-message', message)
	}
	forwardGuildCreation = (guildInfo: GuildInfo) => {}
	forwardChannelCreaton = (channelInfo: ChannelInfo) => {}
	forwardGuildDeletion = (guildInfo: GuildInfo) => {}
	forwardChannelDeletion = (channelInfo: ChannelInfo) => {}
	forwardChannelKick = (discordID: string, channelID: string) => {}
	forwardGuildKick = (discordID: string, channelID: string) => {}
}

// FUNCTIONS INITIATED BY BACKEND
// forward discord message : message-post
// typing indicator : typing-indicator
// message edit   : message-edit
// channel create : channel-create
// guild create   : guild-create
// channel delete : channel-delete
// guild delete   : guild-delete
// channel kick   : channel-kick
// guild kick     : guild-kick
