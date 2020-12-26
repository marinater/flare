import { bgGreen as chalkGreenBG, green as chalkGreen } from 'chalk'
import { createLogStream } from '../logging'
import { Guild, User } from '../models/index'

const dbLogger = createLogStream({ info: chalkGreen('SEQUELIZE: '), error: chalkGreenBG('SEQUELIZE: ') })

export enum DatabaseCodes {
	Error,
	NoSuchElement,
	Success,
}

class UsersManager {
	addUser = async (discordID: string, githubID: string) => {
		try {
			await User.create({ discordID, githubID })
			dbLogger.info(`Saved discord id ${discordID} into Users db`)
			return DatabaseCodes.Success
		} catch (err) {
			dbLogger.error(err.message)
			return DatabaseCodes.Error
		}
	}

	addGuild = async (guildID: string) => {
		try {
			await Guild.create({ guildID })
			dbLogger.info(`Saved discord id ${guildID} into Guilds db`)
			return DatabaseCodes.Success
		} catch (err) {
			dbLogger.error(err.message)
			return DatabaseCodes.Error
		}
	}

	removeGuild = async (guildID: string) => {
		try {
			const count = await Guild.destroy({ where: { guildID } })
			if (count === 0) {
				dbLogger.info(`Tried to delete guildID ${guildID} from guilds but no such guildID was found`)
				return DatabaseCodes.NoSuchElement
			}

			dbLogger.info(`guildID ${guildID} deleted from guilds`)
			return DatabaseCodes.Success
		} catch (err) {
			dbLogger.error(err.message)
			return DatabaseCodes.Error
		}
	}

	addUserToGuild = async (discordID: string, guildID: string) => {
		try {
			const [guild, user] = await Promise.all([Guild.findOne({ where: { guildID } }), User.findOne({ where: { discordID } })])
			if (!guild || !user) {
				dbLogger.info(`Could not add ${discordID} to ${guildID} since one or both don't exist`)
				return DatabaseCodes.NoSuchElement
			}

			await guild.addUser(user)
			return DatabaseCodes.Success
		} catch (err) {
			dbLogger.error(err.message)
			return DatabaseCodes.Error
		}
	}

	removeUserFromGuild = async (discordID: string, guildID: string) => {
		try {
			const [guild, user] = await Promise.all([Guild.findOne({ where: { guildID } }), User.findOne({ where: { discordID } })])
			if (!guild || !user) {
				dbLogger.info(`Could not add ${discordID} to ${guildID} since one or both don't exist`)
				return DatabaseCodes.NoSuchElement
			}

			await guild.removeUser(user)
			return DatabaseCodes.Success
		} catch (err) {
			dbLogger.error(err.message)
			return DatabaseCodes.Error
		}
	}

	getAssociatedGuilds = async (discordID: string) => {
		try {
			const user = await User.findOne({ where: { discordID } })
			if (!user) {
				dbLogger.info(`Could not find user ${discordID} to find associated guilds for`)
				return DatabaseCodes.NoSuchElement
			}

			const guilds = await user.getGuilds()
			return guilds.map(guild => guild.guildID)
		} catch (err) {
			dbLogger.error(err.message)
			return DatabaseCodes.Error
		}
	}

	getAssociatedUsers = async (guildID: string) => {
		try {
			const guild = await Guild.findOne({ where: { guildID } })
			if (!guild) {
				dbLogger.info(`Could not find guild ${guildID} to find associated users for`)
				return DatabaseCodes.NoSuchElement
			}

			const users = await guild.getUsers()
			return users.map(user => user.discordID)
		} catch (err) {
			dbLogger.error(err.message)
			return DatabaseCodes.Error
		}
	}

	getGithubUsername = async (discordID: string) => {
		try {
			const user = await User.findOne({ where: { discordID } })
			if (!user) {
				dbLogger.info(`Could not find user with ${discordID} to find associated github username for`)
				return DatabaseCodes.NoSuchElement
			}

			return user.githubID
		} catch (err) {
			dbLogger.error(err.message)
			return DatabaseCodes.Error
		}
	}

	getDiscordID = async (githubID: string) => {
		try {
			const user = await User.findOne({ where: { githubID } })
			if (!user) {
				dbLogger.info(`Could not find user with ${githubID} to find associated github username for`)
				return DatabaseCodes.NoSuchElement
			}

			return user.discordID
		} catch (err) {
			dbLogger.error(err.message)
			return DatabaseCodes.Error
		}
	}

	getAllUsers = async () => {
		try {
			const users = await User.findAll()
			return users.map(user => user.discordID)
		} catch (err) {
			dbLogger.error(err.message)
			return DatabaseCodes.Error
		}
	}
}

export const usersManager = new UsersManager()
