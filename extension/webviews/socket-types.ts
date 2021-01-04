export interface SocketAttachment {
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

export interface SocketPushMessage {
	guildID: string
	channelID: string
	content: string
}

interface SocketChannelInfo {
	id: string
	name: string
}

export interface SocketGuildInfo {
	id: string
	name: string
	icon: string | null
	channels: SocketChannelInfo[]
}

export interface SocketInitInfo {
	guilds: SocketGuildInfo[]
	discordID: string
	patterns: {
		user: string | null
		everyone: string | null
	}
}

export interface SocketMessageFetch {
	guildID: string
	channelID: string
	limit: number
	before?: string
}
