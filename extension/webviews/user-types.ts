export interface Attachment {
	id: string
	name: string | null
	url: string
	height: number | null
	width: number | null
}

export interface Message {
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
	attachments: Attachment[]
	read: boolean
}

export interface ChannelInfo {
	id: string
	name: string
	messages: Message[]
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
	guilds: GuildInfo[]
	activeGuildID: string | null
	activeChannelID: string | null
}
