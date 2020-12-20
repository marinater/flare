const Discord = require('discord.js')
var { usersManager } = require('./data-store')
var { createRegistrationLink } = require('./routes/auth/discord')

class FlareBot {
	constructor() {
		this.client = new Discord.Client()
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
				const email = await usersManager.getUserEmail(msg.author.id)

				msg.reply(email)
			} else if (command === 'allusers') {
				const allUsers = await usersManager.getAllUsers()
				console.log(allUsers)
			}

			// ex: usersManager.addtoDB()
		})

		this.client.login(process.env.DISCORD_FLAREBOT_TOKEN)
	}
}

module.exports = FlareBot
