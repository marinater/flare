const Discord = require('discord.js')
var { usersManager } = require('./data-store')
var { createRegistrationLink } = require('./routes/auth/discord')
var { SocketManager } = require('./sockets')

class FlareBot {
	constructor(io) {
		this.client = new Discord.Client()
		this.client.login(process.env.DISCORD_FLAREBOT_TOKEN)
		this.socketManager = new SocketManager(io, this.handleMessage, this.guildsHandler)
	}

	extractMessageContents = msg => {
		return {
			author: {
				id: msg.author.id,
				name: msg.author.username,
				pfp: msg.author.displayAvatarURL(),
			},
			messageID: msg.id,
			channelID: msg.channel.id,
			guildID: msg.guild.id,
			timestamp: msg.createdAt.toISOString(),
			editedTimestamp: msg.editedAt && msg.editedAt.toISOString(),
			content: msg.content,
		}
	}

	start = () => {
		// Any initialization required for the bot
		this.client.on('ready', () => {
			console.log(`Logged in as ${this.client.user.tag}!`)
		})

		// When the bot gets added to a new server, the bot stores the guild_id to the database
		this.client.on('guildCreate', guild => {
			console.log('Joined a new guild: ' + guild.name)
			usersManager.storeGuildId(guild.id)
		})

		// When the bot gets removed from a server, the bot removes the guild_id from the database
		this.client.on('guildDelete', guild => {
			console.log('Left a guild: ' + guild.name)
			usersManager.removeGuildId(guild.id)
		})

		// Keeps track of edited message
		this.client.on('messageUpdate', async (oldMsg, newMsg) => {
			const associatedUsersInGuild = await usersManager.getUsersFromGuildAssociation(oldMsg.guild.id)
			for (const user of associatedUsersInGuild) {
				this.socketManager.sendMessage(user.discord_id, 'flare-edit', {
					oldID: oldMsg.id,
					updated: this.extractMessageContents(newMsg),
				})
			}
		})

		// Process all message related tasks
		this.client.on('message', async msg => {
			const prefix = '!'

			if (msg.author.id === this.client.user.id) return

			// Parse out the arguments for the command
			const args = msg.content.slice(prefix.length).trim().split(' ')
			const command = args.shift().toLowerCase()

			// TODO: Add help command - returns embed with list of commands

			// Create a link between discord_id and github_username through OAuth
			if (command === 'link') {
				// Reply with `${process.env.BASE_URL}/auth/discord?discord_id=${msg.author.id}#${msg.author.discriminator}`
				const responseURL = createRegistrationLink(msg.author.id)
				msg.author.send(`Click this link to register: ${responseURL}`)
			} else if (command === 'connect') {
				// make sure user sends in server
				if (msg.guild === null) msg.channel.send(`Please use this command inside the server you would like to connect to.`)
				else {
					// add person to guild
					const result = await usersManager.addGuildUserAssociation(msg.guild.id, msg.author.id)
					if (result) msg.channel.send(`Successfully linked ${msg.author} to ${msg.guild.name}!`)
					else msg.channel.send(`There was an error linking ${msg.author} to ${msg.guild.name}!`)
				}
			} else if (command === 'disconnect') {
				if (msg.guild === null) msg.channel.send(`Please use this command inside the server you would like to disconnect from.`)
				else {
					const result = await usersManager.removeGuildUserAssociation(msg.guild.id, msg.author.id)
					if (result) msg.channel.send(`Successfully disconnected ${msg.author} from ${msg.guild.name}`)
					else msg.channel.send(`There was an error disconnecting ${msg.author} from ${msg.guild.name}!`)
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

				msg.channel.send(helpEmbed)
			}

			// Forward messages over socket
			const associatedUsersInGuild = await usersManager.getUsersFromGuildAssociation(msg.guild.id)
			for (const dbUser of associatedUsersInGuild) {
				const discordID = dbUser.discord_id
				const user = await msg.guild.members.fetch(discordID)
				if (!msg.channel.permissionsFor(user).has('VIEW_CHANNEL')) continue

				this.socketManager.sendMessage(discordID, 'flare-message', this.extractMessageContents(msg))
			}
		})
	}

	handleMessage = async (discordID, data) => {
		if (!data.guildID || !data.channelID || !data.content) {
			return
		}

		const guild = await this.client.guilds.fetch(data.guildID)
		const guildMember = await guild.members.fetch(discordID)
		const channel = await this.client.channels.fetch(data.channelID)

		if (!channel) return

		let res = await channel.send(`${guildMember.displayName}: ${data.content}`)
		res = this.extractMessageContents(res)
		res.author = {
			id: guildMember.user.id,
			name: guildMember.displayName,
			pfp: guildMember.user.displayAvatarURL(),
		}

		res.content = data.content

		this.socketManager.sendMessage(discordID, 'flare-message', res)
	}

	guildsHandler = async discordID => {
		const guildsList = await usersManager.getGuildsFromUserAssociation(discordID)
		const guildInfo = []

		for (const guildID of guildsList) {
			const guild = await this.client.guilds.fetch(guildID)
			const guildMember = await guild.members.fetch(discordID)

			const channels = guild.channels.cache
				.filter(channel => channel.type === 'text')
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

module.exports = FlareBot
