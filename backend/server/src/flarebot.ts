import Discord, { Intents, MessageMentions } from 'discord.js'
import type { Server as SocketServer } from 'socket.io'
import { DatabaseCodes, usersManager } from './controllers/data-store'
import {
	GuildInfo,
	SocketForwardedMessage,
	SocketHooks,
	SocketInitInfo,
	SocketManager,
	SocketMessageFetch,
	SocketMessageFetchResponse,
} from './controllers/sockets'
import { createRegistrationLink } from './routes/auth/discord'
import { AppSettings } from './server-utils'

let intents = new Intents(Intents.NON_PRIVILEGED)
intents.add('GUILD_MEMBERS')
const client = new Discord.Client({ ws: { intents } })

// #############################################################################

// Wrap iffy Discord API calls in catch blocks and return null
// const getUserFromDiscordID = (discordID: string) =>
// 	client.users.fetch(discordID).catch(err => {
// 		console.error(err)
// 		return null
// 	})

const getGuildMemberFromDiscordID = (
	discordID: string,
	guild: Discord.Guild
) => {
	return guild.members.fetch(discordID).catch((err) => {
		console.error(err)
		return null
	})
}

const getGuildFromGuildID = (guildID: string) =>
	client.guilds.fetch(guildID).catch((err) => {
		console.error(err)
		return null
	})

const getChannelFromChannelID = (channelID: string) =>
	client.channels.fetch(channelID).catch((err) => {
		console.error(err)
		return null
	})

const getGuildInfo = async (guildID: string, discordID: string) => {
	const guild = await getGuildFromGuildID(guildID)
	if (!guild) return null

	const guildMember = await getGuildMemberFromDiscordID(discordID, guild)
	if (!guildMember) return null

	const channels = guild.channels.cache
		.filter((channel) => channel.type === 'text')
		.filter((channel) => {
			const permissions = channel.permissionsFor(guildMember)
			if (!permissions) return false
			return permissions.has('VIEW_CHANNEL')
		})
		.map((channel) => ({ name: channel.name, id: channel.id }))

	const guildInfo: GuildInfo = {
		id: guild.id,
		name: guild.name,
		icon: guild.iconURL(),
		channels,
		members: await guild.members
			.fetch()
			.then((members) =>
				members.map((member) => ({
					nickname: member.nickname,
					displayName: member.displayName,
					id: member.id,
				}))
			)
			.catch((err) => {
				console.error(err)
				return []
			}),
	}

	return guildInfo
}

const sendDiscordMessage = (
	message: string | Discord.MessageEmbed,
	channel: Discord.TextChannel | Discord.DMChannel | Discord.NewsChannel
) => {
	if (typeof message === 'string') message = message.substring(0, 2000)
	return channel.send(message).catch((err) => {
		console.error(err)
		return null
	})
}

// #############################################################################

const extractMessageContents = (
	msg: Discord.Message & { guild: { id: string } }
): SocketForwardedMessage => {
	return {
		author: {
			id: msg.author.id,
			name: msg.author.username,
			pfp: msg.author.displayAvatarURL(),
		},
		messageID: msg.id,
		channelID: msg.channel.id,
		guildID: msg.guild?.id || '',
		timestamp: msg.createdAt.toISOString(),
		editedTimestamp: msg.editedAt?.toISOString() || null,
		content: msg.content,
		attachments: msg.attachments.map((attachment) => ({
			id: attachment.id,
			name: attachment.name,
			url: attachment.url,
			height: attachment.height,
			width: attachment.width,
		})),
	}
}

// #############################################################################

export class FlareBot {
	private readonly socketManager: SocketManager

	constructor(io: SocketServer) {
		client.login(AppSettings.discordToken)

		const socketHooks = (this.socketManager = new SocketManager(io, {
			onSocketInit: this.onSocketInit,
			onMessagePost: this.onMessagePost,
			onMessageFetch: this.onMessageFetch,
		}))
	}

	// #############################################################################
	// Bot Commands

	onLinkCommand = (message: Discord.Message) => {
		const responseURL = createRegistrationLink(message.author.id)
		message.author
			.send(`Click this link to register: ${responseURL}`)
			.catch((err) => console.error(err))
	}

	onConnectCommand = async (message: Discord.Message) => {
		// make sure user sends in server
		if (message.guild === null)
			sendDiscordMessage(
				`Please use this command inside the server you would like to connect to.`,
				message.channel
			)
		else {
			// add person to guild
			const result = await usersManager.addUserToGuild(
				message.author.id,
				message.guild.id
			)
			if (result)
				sendDiscordMessage(
					`Successfully linked ${message.author} to ${message.guild.name}!`,
					message.channel
				)
			else
				sendDiscordMessage(
					`There was an error linking ${message.author} to ${message.guild.name}!`,
					message.channel
				)
		}
	}

	onDisconnectCommand = async (message: Discord.Message) => {
		if (message.guild === null)
			sendDiscordMessage(
				`Please use this command inside the server you would like to disconnect from.`,
				message.channel
			)
		else {
			const result = await usersManager.removeUserFromGuild(
				message.author.id,
				message.guild.id
			)
			if (result)
				sendDiscordMessage(
					`Successfully disconnected ${message.author} from ${message.guild.name}`,
					message.channel
				)
			else
				sendDiscordMessage(
					`There was an error disconnecting ${message.author} from ${message.guild.name}!`,
					message.channel
				)
		}
	}

	onHelpCommand = (message: Discord.Message) => {
		const helpEmbed = new Discord.MessageEmbed()
			.setColor('#0099ff')
			.setTitle('FlareBot Commands:')
			.addFields(
				{
					name: '!link:',
					value:
						'Run this command to link your Github account to your Discord account using OAuth',
				},
				{
					name: '!connect:',
					value:
						'Run this command inside a FlareBot associated server to receive those messages in VSCode',
				},
				{
					name: '!disconnect:',
					value:
						'Run this command inside a FlareBot associated server to disconnect your Discord account from VSCode',
				}
			)

		sendDiscordMessage(helpEmbed, message.channel)
	}

	// #############################################################################
	start = () => {
		client.on('ready', () =>
			console.log(`Logged in as ${client.user?.tag}!`)
		)
		client.on('guildCreate', (guild) => {
			console.log(`Added guild ${guild.name}:${guild.id} to database`)
			usersManager.addGuild(guild.id)
		})
		client.on('guildDelete', (guild) => {
			console.log(`Removed guild ${guild.name}:${guild.id} from database`)
			usersManager.removeGuild(guild.id)
		})
		client.on('messageUpdate', () => {})
		client.on('message', async (message) => {
			switch (message.content) {
				case '!link':
					this.onLinkCommand(message)
					break
				case '!connect':
					await this.onConnectCommand(message)
					break
				case '!disconnect':
					await this.onDisconnectCommand(message)
					break
				case '!help':
					this.onHelpCommand(message)
					break
				default:
					break
			}

			if (message.author.id === client.user?.id) return
			if (message.channel.type === 'dm' || !message.guild) return

			// @ts-ignore
			const extractedMessage = extractMessageContents(message)
			this.socketManager.forwardMessage(extractedMessage)
		})
	}

	// #############################################################################

	onMessageFetch = async (
		data: SocketMessageFetch
	): Promise<SocketMessageFetchResponse> => {
		const guild = await getGuildFromGuildID(data.guildID)
		if (!guild)
			return {
				messages: [],
				complete: false,
			}

		const guildMember = await getGuildMemberFromDiscordID(
			data.discordID,
			guild
		)

		if (!guildMember)
			return {
				messages: [],
				complete: false,
			}

		const channelUnknown = await getChannelFromChannelID(data.channelID)

		if (!channelUnknown || !guildMember.hasPermission('SEND_MESSAGES'))
			return {
				messages: [],
				complete: false,
			}

		if (channelUnknown.type !== 'text')
			return {
				messages: [],
				complete: false,
			}

		const channel = channelUnknown as Discord.TextChannel

		const oldestMessageID = channel.messages
			.fetch({ after: '1', limit: 1 })
			.then((messages) => {
				if (messages.first()) return messages.first()!.id
				return null
			})
			.catch((err) => {
				console.log(err)
				return null
			})

		const messageList = channel.messages
			.fetch({ limit: data.limit, before: data.before }, false, true)
			.then((messages) => messages.map(extractMessageContents))
			.catch((err) => {
				console.error(err)
				return []
			})

		return Promise.all([oldestMessageID, messageList]).then(
			([oldestID, messages]) => {
				return {
					messages,
					complete:
						messages[messages.length - 1]?.messageID === oldestID,
				}
			}
		)
	}

	onMessagePost: SocketHooks['onMessagePost'] = async (data) => {
		const guild = await getGuildFromGuildID(data.guildID)
		if (!guild) return { success: false, message: 'guild does not exist' }

		const guildMember = await getGuildMemberFromDiscordID(
			data.discordID,
			guild
		)

		if (!guildMember)
			return {
				success: false,
				message: 'user is not a member of the provided guild',
			}

		const channelUnknown = await getChannelFromChannelID(data.channelID)

		if (!channelUnknown || !guildMember.hasPermission('SEND_MESSAGES'))
			return {
				success: false,
				message:
					'user does not have permissions to send messages to the given channel',
			}

		if (channelUnknown.type !== 'text') {
			return {
				success: false,
				message:
					'provided channel does not support sending text messages',
			}
		}

		const channel = channelUnknown as Discord.TextChannel

		const res = await sendDiscordMessage(
			`${guildMember.displayName}: ${data.content}`,
			channel
		)

		if (!res || res.guild === null) {
			return {
				success: false,
				message: 'error while trying to send the message',
			}
		}

		// @ts-ignore
		const extractedMessage = extractMessageContents(res)
		extractedMessage.author = {
			id: guildMember.user.id,
			name: guildMember.displayName,
			pfp: guildMember.user.displayAvatarURL(),
		}
		extractedMessage.content = data.content

		this.socketManager.forwardMessage(extractedMessage)

		return { success: true }
	}

	onSocketInit = async (discordID: string): Promise<SocketInitInfo> => {
		const guildsList = await usersManager.getAssociatedGuilds(discordID)
		if (
			guildsList === DatabaseCodes.Error ||
			guildsList === DatabaseCodes.NoSuchElement
		) {
			return {
				discordID,
				guilds: [],
				patterns: {
					everyone: MessageMentions.EVERYONE_PATTERN.toString(),
					user: MessageMentions.USERS_PATTERN.toString(),
				},
			}
		}

		const allGuilds = await Promise.all(
			guildsList.map((guildID) => getGuildInfo(guildID, discordID))
		)

		return {
			discordID,
			guilds: allGuilds.filter((guild) => guild !== null) as GuildInfo[],
			patterns: {
				everyone: MessageMentions.EVERYONE_PATTERN.toString(),
				user: MessageMentions.USERS_PATTERN.toString(),
			},
		}
	}
}
