import Discord from 'discord.js'
import type { Server as SocketServer } from 'socket.io'
import { DatabaseCodes, usersManager } from './controllers/data-store'
import {
	GuildInfo,
	SocketForwardedMessage,
	SocketInitInfo,
	SocketManager,
	SocketMessageFetch,
	SocketPushMessage,
} from './controllers/sockets'
import { createRegistrationLink } from './routes/auth/discord'
import { AppSettings } from './server-utils'

const client = new Discord.Client()

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

	return {
		id: guild.id,
		name: guild.name,
		icon: guild.iconURL(),
		channels,
	} as GuildInfo
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

		const socketHooks = {
			onSocketInit: this.onSocketInit,
			onMessagePost: this.onMessagePost,
			onMessageFetch: this.onMessageFetch
		}

		this.socketManager = new SocketManager(io, socketHooks)
	}

	// #############################################################################
	// Bot Commands

	onLinkCommand = (message: Discord.Message) => {
		const responseURL = createRegistrationLink(message.author.id)
		message.author.send(`Click this link to register: ${responseURL}`)
	}

	onConnectCommand = async (message: Discord.Message) => {
		// make sure user sends in server
		if (message.guild === null)
			message.channel.send(
				`Please use this command inside the server you would like to connect to.`
			)
		else {
			// add person to guild
			const result = await usersManager.addUserToGuild(
				message.author.id,
				message.guild.id
			)
			if (result)
				message.channel.send(
					`Successfully linked ${message.author} to ${message.guild.name}!`
				)
			else
				message.channel.send(
					`There was an error linking ${message.author} to ${message.guild.name}!`
				)
		}
	}

	onDisconnectCommand = async (message: Discord.Message) => {
		if (message.guild === null)
			message.channel.send(
				`Please use this command inside the server you would like to disconnect from.`
			)
		else {
			const result = await usersManager.removeUserFromGuild(
				message.author.id,
				message.guild.id
			)
			if (result)
				message.channel.send(
					`Successfully disconnected ${message.author} from ${message.guild.name}`
				)
			else
				message.channel.send(
					`There was an error disconnecting ${message.author} from ${message.guild.name}!`
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

		message.channel.send(helpEmbed)
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
		client.on('messageUpdate', () => { })
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

	onMessageFetch = async (data: SocketMessageFetch): Promise<SocketForwardedMessage[]> => {
	
		const guild = await getGuildFromGuildID(data.guildID)
		if (!guild) return []

		const guildMember = await getGuildMemberFromDiscordID(
			data.discordID,
			guild
		)

		if (!guildMember) return []

		const channelUnknown = await getChannelFromChannelID(data.channelID)

		if (!channelUnknown || !guildMember.hasPermission('SEND_MESSAGES'))
			return []

		if (channelUnknown.type !== 'text') return []

		const channel = channelUnknown as Discord.TextChannel

		return channel.messages.fetch({ limit: data.limit, before: data.before }).then(messages => messages.map(extractMessageContents)).catch(() => [])
	}


	onMessagePost = async (data: SocketPushMessage) => {
		const guild = await getGuildFromGuildID(data.guildID)
		if (!guild) return

		const guildMember = await getGuildMemberFromDiscordID(
			data.discordID,
			guild
		)

		if (!guildMember) return

		const channelUnknown = await getChannelFromChannelID(data.channelID)

		if (!channelUnknown || !guildMember.hasPermission('SEND_MESSAGES'))
			return

		if (channelUnknown.type !== 'text') return

		const channel = channelUnknown as Discord.TextChannel

		const res = await channel.send(
			`${guildMember.displayName}: ${data.content}`
		)
		if (res.guild === null) return

		// @ts-ignore
		const extractedMessage = extractMessageContents(res)
		extractedMessage.author = {
			id: guildMember.user.id,
			name: guildMember.displayName,
			pfp: guildMember.user.displayAvatarURL(),
		}
		extractedMessage.content = data.content

		this.socketManager.forwardMessage(extractedMessage)
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
			}
		}

		const allGuilds = await Promise.all(
			guildsList.map((guildID) => getGuildInfo(guildID, discordID))
		)

		return {
			discordID,
			guilds: allGuilds.filter((guild) => guild !== null) as GuildInfo[],
		}
	}
}
