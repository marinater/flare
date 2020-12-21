const { Pool } = require('pg')

class UsersManager {
	constructor() {
		this.pool = new Pool({
			connectionString: process.env.DATABASE_URL,
		})
	}

	addUser = (discord_id, github_username) => {
		console.log(`add user github_username requested by ${discord_id}`)
		const statement =
			'insert into users (discord_id, github_username) values ($1, $2) on conflict (discord_id) do update set discord_id = $1, github_username = $2'

		return this.pool
			.query(statement, [discord_id, github_username])
			.then(() => true)
			.catch(() => false)
	}

	storeGuildId = (guild_id) => {
		const statement =
			'insert into guilds (guild_id) values ($1) on conflict (guild_id) do nothing'

		return this.pool
			.query(statement, [guild_id])
			.then(() => true)
			.catch(() => false)
	}

	addGuildUserAssociation = (guild_id, discord_id) => {
		const statement =
			'insert into guilds_users (guild_id, discord_id) values ($1, $2) on conflict (guild_id, discord_id) do nothing'

		return this.pool
			.query(statement, [guild_id, discord_id])
			.then(() => true)
			.catch(() => false)
	}

	getGithubUsername = async (discord_id) => {
		console.log(`get user github_username requested by ${discord_id}`)
		const statement =
			'select github_username from users where discord_id = $1'

		return this.pool
			.query(statement, [discord_id])
			.then((res) => res.rows[0].github_username)
			.catch(() => null)
	}

	getAllUsers = async () => {
		console.log(`get all users requested`)
		const statement = 'select * from users'

		return this.pool
			.query(statement)
			.then((res) => res.rows)
			.catch(() => null)
	}

	stop = () => {
		this.pool.end()
	}
}

module.exports = {
	usersManager: new UsersManager(),
}
