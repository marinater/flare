const { Pool } = require('pg')

class UsersManager {
	constructor() {
		this.pool = new Pool()
	}

	addUser = async (discord_id, email) => {
		const insertOrUpdateQuery =
			'insert into users (discord_id, email) values ($1, $2) on conflict (discord_id) do update set discord_id = $2'
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

	getUserEmail = async (discord_id) => {
		const query = 'select email from users where discord_id = $1'
		try {
			const res = await this.pool.query(query, [discord_id])
			return res.rows[0].github_username
		} catch (err) {
			return null
		}
	}

	getAllUsers = async () => {
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
