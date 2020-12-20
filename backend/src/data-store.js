const { Pool, Client } = require('pg')

class UsersManager {
	constructor() {
		this.pool = new Pool({
			connectionString: process.env.DATABASE_URL,
		})
	}

	addUser = async (discord_id, email) => {
		console.log(`add user github_username requested by ${discord_id}`)
		const insertOrUpdateQuery =
			'insert into users (discord_id, github_username) values ($1, $2) on conflict (discord_id) do update set discord_id = $1, github_username = $2'
		try {
			const res = await this.pool.query(insertOrUpdateQuery, [
				discord_id,
				email,
			])
			return true
		} catch (err) {
			return false
		}
	}

	getGithubUsername = async (discord_id) => {
		console.log(`get user github_username requested by ${discord_id}`)
		const query = 'select github_username from users where discord_id = $1'
		try {
			const res = await this.pool.query(query, [discord_id])
			return res.rows[0].github_username
		} catch (err) {
			return null
		}
	}

	getAllUsers = async () => {
		console.log(`get all users requested`)
		const query = 'select * from users'
		try {
			const res = await this.pool.query(query)
			return res.rows
		} catch (err) {
			return null
		}
	}

	stop = () => {
		this.pool.end()
	}
}

module.exports = {
	usersManager: new UsersManager(),
}
