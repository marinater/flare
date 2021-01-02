import cloneDeep from 'lodash.clonedeep'
import { io } from 'socket.io-client'
import { derived, writable } from 'svelte/store'
import type { SocketForwardedMessage, SocketInitInfo, SocketPushMessage } from './socket-types'
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
		return $user
	})
}

export const setActiveChannelID = (channelID: string) => {
	user.update(user => {
		const $user = cloneDeep(user)
		$user.activeChannelID = channelID
		return $user
	})
}

const socket = io(gBaseURL, { auth: { sessionID: gSessionID } })

socket.on('forward-message', (dataUnknown: any) => {
	const data = dataUnknown as SocketForwardedMessage
	user.update(user => {
		const newUser = cloneDeep(user)

		const guild = newUser.guilds.find(x => x.id === data.guildID)
		if (!guild) {
			return user
		}

		const channel = guild.channels.find(x => x.id === data.channelID)
		if (!channel) {
			return user
		}

		channel.messages.push({ ...data, read: false })
		return newUser
	})
})

socket.on('connect_error', (err: any) => console.error(err))

socket.emit('socket-init', (dataUnknown: any) => {
	// TODO: VALIDATE dataUnknown
	const data = dataUnknown as SocketInitInfo
	user.update(user => {
		const newUser = cloneDeep(user)

		newUser.discordID = data.discordID
		newUser.activeGuildID = data.guilds[0]?.id || null
		newUser.activeChannelID = data.guilds[0]?.channels[0]?.id || null

		newUser.guilds = data.guilds.map(guild => ({
			...guild,
			unread: 0,
			channels: guild.channels.map(channel => ({
				...channel,
				messages: [],
				unread: 0
			}))
		}))

		return newUser
	})
})

const postMessage = (message: SocketPushMessage) => {
	socket.emit('message-post', message)
}

export const handlers = {
	postMessage
}
