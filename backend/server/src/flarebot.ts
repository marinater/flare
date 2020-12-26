import Discord from 'discord.js'
import type { Server as SocketServer } from 'socket.io'
import { DatabaseCodes, usersManager } from './controllers/data-store'
import { SocketForwardedMessage, SocketManager } from './controllers/sockets'
import { createRegistrationLink } from './routes/auth/discord'
import { AppSettings } from './server-utils'

export class FlareBot {
	client = new Discord.Client()
	socketManager: SocketManager

	constructor(io: SocketServer) {
		this.client.login(AppSettings.discordToken)
		this.socketManager = new SocketManager(io, this.handleMessage, this.guildsHandler)
	}

	extractMessageContents = (msg: Discord.Message | Discord.PartialMessage): SocketForwardedMessage => {
		return {
			author: {
				id: msg.author?.id || '',
				name: msg.author?.username || '',
				pfp: msg.author?.displayAvatarURL() || '',
			},
			messageID: msg.id,
			channelID: msg.channel.id,
			guildID: msg.guild?.id || '',
			timestamp: msg.createdAt.toISOString(),
			editedTimestamp: (msg.editedAt && msg.editedAt.toISOString()) || '',
			content: msg.content || '',
		}
	}

	start = () => {
		// Any initialization required for the bot
		this.client.on('ready', () => {
			console.log(`Logged in as ${this.client.user?.tag}!`)
		})

		// When the bot gets added to a new server, the bot stores the guild_id to the database
		this.client.on('guildCreate', guild => {
			console.log('Joined a new guild: ' + guild.name)
			usersManager.addGuild(guild.id)
		})

		// When the bot gets removed from a server, the bot removes the guild_id from the database
		this.client.on('guildDelete', guild => {
			console.log('Left a guild: ' + guild.name)
			usersManager.removeGuild(guild.id)
		})

		// Keeps track of edited message
		this.client.on('messageUpdate', async (oldMsg, newMsg) => {
			console.log(oldMsg)
			if (!oldMsg.guild || oldMsg.embeds) return

			const associatedUsers = await usersManager.getAssociatedUsers(oldMsg.guild.id)
			if (associatedUsers === DatabaseCodes.NoSuchElement || associatedUsers === DatabaseCodes.Error) return

			for (const user of associatedUsers) {
				this.socketManager.sendMessage(user, 'flare-edit', {
					// @ts-ignore
					oldID: oldMsg.id,
					updated: this.extractMessageContents(newMsg),
				})
			}
		})

		// Process all message related tasks
		this.client.on('message', async message => {
			const prefix = '!'

			if (message.author.id === this.client.user?.id) return

			// Parse out the arguments for the command
			const args = message.content.slice(prefix.length).trim().split(' ')
			const command = args.shift()?.toLowerCase()

			// Create a link between discord_id and github_username through OAuth
			if (command === 'link') {
				// Reply with `${process.env.BASE_URL}/auth/discord?discord_id=${msg.author.id}#${msg.author.discriminator}`
				const responseURL = createRegistrationLink(message.author.id)
				message.author.send(`Click this link to register: ${responseURL}`)
			} else if (command === 'connect') {
				// make sure user sends in server
				if (message.guild === null) message.channel.send(`Please use this command inside the server you would like to connect to.`)
				else {
					// add person to guild
					const result = await usersManager.addUserToGuild(message.author.id, message.guild.id)
					if (result) message.channel.send(`Successfully linked ${message.author} to ${message.guild.name}!`)
					else message.channel.send(`There was an error linking ${message.author} to ${message.guild.name}!`)
				}
			} else if (command === 'disconnect') {
				if (message.guild === null) message.channel.send(`Please use this command inside the server you would like to disconnect from.`)
				else {
					const result = await usersManager.removeUserFromGuild(message.author.id, message.guild.id)
					if (result) message.channel.send(`Successfully disconnected ${message.author} from ${message.guild.name}`)
					else message.channel.send(`There was an error disconnecting ${message.author} from ${message.guild.name}!`)
				}
			} else if (command === 'help') {
				const helpEmbed = new Discord.MessageEmbed()
					.setColor('#0099ff')
					.setTitle('Flare Help')
					.addFields(
						{ name: '!link:', value: 'Run this command to link your Github to your Discord' },
						{ name: '!connect:', value: 'Run this command inside a server with FlareBot to receive messages in VSCode' },
						{ name: '!disconnect:', value: 'Run this command inside a server with FlareBot to disconnect your account in VSCode' }
					)

				message.channel.send(helpEmbed)
			}

			if (message.channel.type === 'dm') return
			this.propogateMessage(this.extractMessageContents(message))
		})
	}

	propogateMessage = async (message: any, guild?: Discord.Guild, channel?: Discord.GuildChannel) => {
		if (!guild) guild = await this.client.guilds.fetch(message.guildID)
		// @ts-ignore
		if (!channel) channel = await this.client.channels.fetch(message.channelID)

		const associatedUsers = await usersManager.getAssociatedUsers(message.guildID)
		if (associatedUsers === DatabaseCodes.Error || associatedUsers === DatabaseCodes.NoSuchElement) return

		for (const discordID of associatedUsers) {
			const user = await guild.members.fetch(discordID)
			// @ts-ignore
			if (!channel.permissionsFor(user).has('VIEW_CHANNEL')) continue

			this.socketManager.sendMessage(discordID, 'flare-message', message)
		}
	}

	handleMessage = async (discordID: string, data: any) => {
		if (!data.guildID || !data.channelID || !data.content) {
			return
		}

		const guild = await this.client.guilds.fetch(data.guildID)
		const guildMember = await guild.members.fetch(discordID)
		const channel = await this.client.channels.fetch(data.channelID)

		if (!channel) return

		//@ts-ignore
		let res = await channel.send(`${guildMember.displayName}: ${data.content}`)
		res = this.extractMessageContents(res)
		res.author = {
			id: guildMember.user.id,
			name: guildMember.displayName,
			pfp: guildMember.user.displayAvatarURL(),
		}
		res.content = data.content

		this.propogateMessage(res)
	}

	guildsHandler = async (discordID: string) => {
		const guildsList = await usersManager.getAssociatedGuilds(discordID)
		if (guildsList === DatabaseCodes.Error || guildsList === DatabaseCodes.NoSuchElement) return []

		const guildInfo = []

		for (const guildID of guildsList) {
			const guild = await this.client.guilds.fetch(guildID)
			const guildMember = await guild.members.fetch(discordID)

			const channels = guild.channels.cache
				.filter(channel => channel.type === 'text')
				// @ts-ignore
				.filter(channel => channel.permissionsFor(guildMember).has('VIEW_CHANNEL'))
				.map(channel => ({ name: channel.name, id: channel.id }))

			guildInfo.push({
				id: guild.id,
				name: guild.name,
				icon: guild.iconURL(),
				channels,
			})
		}

		return guildInfo
	}
}
