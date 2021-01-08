import cloneDeep from 'lodash.clonedeep'
import { io } from 'socket.io-client'
import { derived, writable } from 'svelte/store'
import type {
	SocketForwardedMessage,
	SocketInitInfo,
	SocketMessageFetch,
	SocketMessageFetchResponse,
	SocketPushMessage
} from './socket-types'
import type { User } from './user-types'

export const user = writable<User>({
	discordID: 'unknown',
	guilds: [],
	patterns: {
		user: null,
		everyone: null
	},
	activeGuildID: null,
	activeChannelID: null
})

const deserializeRegExp = (serialized: string | null) => {
	if (!serialized) {
		return null
	}

	const fragments = serialized.match(/\/(.*?)\/([a-z]*)?$/i)
	if (!fragments) {
		return null
	}

	return new RegExp(fragments[1], fragments[2] || '')
}

export const patterns = derived(user, $user => ({
	user: deserializeRegExp($user.patterns.user),
	everyone: deserializeRegExp($user.patterns.everyone)
}))

export const discordID = derived(user, $user => $user.discordID)

// export const patterns = {
// 	user: /<@!?(\d{17,19})>/g,
// 	everyone: /@(everyone|here)/g
// }

export const activeGuild = derived(user, $user => $user.guilds.find(guild => guild.id === $user.activeGuildID) || null)

export const activeChannel = derived([user, activeGuild], ([$userStore, $activeGuild]) => {
	if (!$activeGuild || !$userStore.activeChannelID) {
		return null
	}
	return $activeGuild.channels.find(channel => channel.id === $userStore.activeChannelID) || null
})

export const setActiveGuildID = (guildID: string) => {
	user.update(user => {
		const $user = cloneDeep(user)
		$user.activeGuildID = guildID

		const guild = $user.guilds.find(x => x.id === guildID)
		const channel = guild?.channels[0]
		$user.activeChannelID = channel?.id || null

		if (guild && channel && channel.unread) {
			guild.unread -= 1
			channel.unread = false
		}

		return $user
	})
}

export const setActiveChannelID = (channelID: string) => {
	user.update(user => {
		const $user = cloneDeep(user)
		$user.activeChannelID = channelID
		const guild = $user.guilds.find(x => x.id === $user.activeGuildID)
		const channel = guild?.channels.find(x => x.id === channelID)

		if (guild && channel && channel.unread) {
			guild.unread -= 1
			channel.unread = false
		}

		return $user
	})
}

const socket = io(gBaseURL, { auth: { sessionID: gSessionID } })

socket.on('forward-message', (dataUnknown: any) => {
	const data = dataUnknown as SocketForwardedMessage
	user.update(user => {
		const $user = cloneDeep(user)

		const guild = $user.guilds.find(x => x.id === data.guildID)
		if (!guild) {
			return $user
		}

		const channel = guild.channels.find(x => x.id === data.channelID)
		if (!channel) {
			return $user
		}

		channel.messages.push(data)

		if (data.channelID !== $user.activeChannelID && !channel.unread) {
			guild.unread += 1
			channel.unread = true
		}

		return $user
	})
})

socket.on('connect_error', (err: any) => console.error(err))

socket.emit('socket-init', (dataUnknown: any) => {
	// TODO: VALIDATE dataUnknown
	const data = dataUnknown as SocketInitInfo
	user.update(user => {
		const $user = cloneDeep(user)

		$user.discordID = data.discordID
		$user.activeGuildID = data.guilds[0]?.id || null
		$user.activeChannelID = data.guilds[0]?.channels[0]?.id || null
		$user.patterns = {
			everyone: data.patterns.everyone,
			user: data.patterns.user
		}
		$user.guilds = data.guilds.map(guild => ({
			...guild,
			unread: 0,
			channels: guild.channels.map(channel => ({
				...channel,
				messages: [],
				unread: false,
				fetchedAll: false
			}))
		}))

		return $user
	})
})

const fetchMessages = (fetchRequest: SocketMessageFetch, callback?: (fetchedLastMessage: boolean) => void) => {
	socket.emit('message-fetch', fetchRequest, (dataUnknown: any) => {
		const data = dataUnknown as SocketMessageFetchResponse

		user.update(user => {
			const $user = cloneDeep(user)
			const guild = $user.guilds.find(x => x.id === fetchRequest.guildID) || null
			const channel = guild?.channels.find(x => x.id === fetchRequest.channelID) || null

			if (!channel) {
				callback && callback(false)
				return user
			}

			if (!channel.fetchedAll) {
				channel.messages = [...data.messages.reverse(), ...channel.messages]
				channel.fetchedAll = data.complete
			}

			callback && setTimeout(() => callback(channel.fetchedAll), 0)
			return $user
		})
	})
}

const postMessage = (message: SocketPushMessage) => {
	socket.emit('message-post', message)
}

export const handlers = {
	postMessage,
	fetchMessages
}
