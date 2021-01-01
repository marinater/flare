// ################## ChatMessage.svelte ##################

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

// ################## GuildIcon.svelte ##################

export interface ChannelInfo {
	id: string
	name: string
	messages: SocketForwardedMessage[]
	unread: number
}

export interface GuildInfo {
	id: string
	name: string
	icon: string | null
	channels: ChannelInfo[]
	unread: number
}

export interface User {
	discordID: string
	sessionID: string
	guilds: GuildInfo[]
}
