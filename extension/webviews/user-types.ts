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
}

export interface ChannelInfo {
	id: string
	name: string
	messages: Message[]
	fetchedAll: boolean
	unread: boolean
}

export interface GuildInfo {
	id: string
	name: string
	icon: string | null
	channels: ChannelInfo[]
	unread: number
	members: {
		nickname: string | null
		displayName: string
		id: string
	}[]
}

export interface User {
	discordID: string
	guilds: GuildInfo[]
	activeGuildID: string | null
	activeChannelID: string | null
	patterns: {
		user: string | null
		everyone: string | null
	}
}
