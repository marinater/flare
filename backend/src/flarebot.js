const Discord = require('discord.js')
var { usersManager } = require('./data-store')
var { createRegistrationLink } = require('./routes/auth/discord')
var { SocketManager } = require('./sockets')

class FlareBot {
	constructor(io) {
		this.client = new Discord.Client()
		this.client.login(process.env.DISCORD_FLAREBOT_TOKEN)
		this.socketManager = new SocketManager(io, this.handleMessage)
	}

	start = () => {
		this.client.on('ready', () => {
			console.log(`Logged in as ${this.client.user.tag}!`)
		})

		this.client.on('message', async (msg) => {
			const prefix = '!'

			if (msg.author.bot) return

			// Parse out the arguments for the command
			const args = msg.content.slice(prefix.length).trim().split(' ')
			const command = args.shift().toLowerCase()

			if (command === 'register') {
				// Reply with `${process.env.BASE_URL}/auth/discord?discord_id=${msg.author.id}#${msg.author.discriminator}`
				const responseURL = createRegistrationLink(msg.author.id)

				msg.author.send(`Click this link to register: ${responseURL}`)
			} else if (command === 'request') {
				const username = await usersManager.getGithubUsername(
					msg.author.id
				)
				if (username !== null) msg.reply(username)
				else msg.reply("that user don't exist")
			} else if (command === 'allusers') {
				const allUsers = await usersManager.getAllUsers()
				if (allUsers !== null) console.log(allUsers)
			} else {
				// socketClient.sendMessage(msg, msg.Guild.id)
			}
			// : usersManager.addtoDB()
		})
	}

	handleMessage = (msg) => {
		console.log(msg)
	}
}

module.exports = FlareBot
