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
			messageID: msg.id,
			author: {
				authorID: msg.author.id,
				authorName: msg.author.username,
				authorPFP: msg.author.displayAvatarURL(),
			},
			guild: {
				guildID: msg.guild.id,
				guildName: msg.guild.name,
				guildPFP: msg.guild.iconURL(),
			},
			channelID: msg.channel.id,
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
			} else if (command === 'request') {
				const username = await usersManager.getGithubUsername(msg.author.id)
				if (username !== null) msg.reply(username)
				else msg.reply("that user don't exist")
			} else if (command === 'allusers') {
				const allUsers = await usersManager.getAllUsers()
				if (allUsers !== null) console.log(allUsers)
			}

			// Forward messages over socket
			const associatedUsersInGuild = await usersManager.getUsersFromGuildAssociation(msg.guild.id)
			for (const user of associatedUsersInGuild) {
				this.socketManager.sendMessage(user.discord_id, 'flare-message', this.extractMessageContents(msg))
			}
		})
	}

	handleMessage = (discord_id, data) => {
		const user = this.client.fetchUser(`${discord_id}`)

	}

	guildsHandler = async discord_id => {
		const guildsList = await usersManager.getGuildsFromUserAssociation(discord_id)

		return guildsList.map((guild_id) => {
			const guild = this.client.guilds.get(guild_id)

			return {
				guildID: guild.id,
				guildName: guild.name,
				guildPFP: guild.iconURL(),
			}
		})
	}
}

module.exports = FlareBot
