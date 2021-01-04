import cloneDeep from 'lodash.clonedeep'
import { io } from 'socket.io-client'
import { derived, writable } from 'svelte/store'
import type { SocketForwardedMessage, SocketInitInfo, SocketMessageFetch, SocketPushMessage } from './socket-types'
import type { User } from './user-types'

export const user = writable<User>({
	discordID: 'unknown',
	guilds: [],
	activeGuildID: null,
	activeChannelID: null
})

export const activeGuild = derived(
	user,
	$userStore => $userStore.guilds.find(guild => guild.id === $userStore.activeGuildID) || null
)

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

		$user.guilds = data.guilds.map(guild => ({
			...guild,
			unread: 0,
			channels: guild.channels.map(channel => ({
				...channel,
				messages: [],
				unread: false
			}))
		}))

		return $user
	})
})

const fetchMessages = (fetchRequest: SocketMessageFetch, callback?: (numMessages: number) => void) => {
	socket.emit('message-fetch', fetchRequest, (dataUnknown: any) => {
		const data = dataUnknown as SocketForwardedMessage[]

		if (data.length > 0) {
			user.update(user => {
				const $user = cloneDeep(user)
				const guild = $user.guilds.find(x => x.id === fetchRequest.guildID) || null
				const channel = guild?.channels.find(x => x.id === fetchRequest.channelID) || null
				if (!channel) {
					return user
				}

				channel.messages = [...data.reverse(), ...channel.messages]

				return $user
			})
		}

		callback && callback(data.length)
	})
}

const postMessage = (message: SocketPushMessage) => {
	socket.emit('message-post', message)
}

export const handlers = {
	postMessage,
	fetchMessages
}
