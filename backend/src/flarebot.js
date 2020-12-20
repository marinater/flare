const Discord = require('discord.js')
var { usersManager } = require('./data-store')

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
				const responseURL = `${process.env.BASE_URL}/auth/discord?discord_id=${msg.author.id}`
				msg.author.send(`Click this link to register: ${responseURL}`)
			} else if (command === 'request') {
				const githubUsername = await usersManager.getGithubUsername(
					msg.author.id
				)

				msg.reply(githubUsername)
			}

			// ex: usersManager.addtoDB()
		})

		this.client.login(process.env.DISCORD_FLAREBOT_TOKEN)
	}
}

module.exports = FlareBot
