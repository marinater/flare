const { Pool } = require('pg')

class UsersManager {
	constructor() {
		this.pool = new Pool()
	}

	addUser = async (discord_id, github_username) => {
		const insertOrUpdateQuery = `update users set discord_id = $1, github_username = $2 where discord_id = $1;
                                        insert into users(discord_id, github_username)
                                        SELECT $1, $2
                                        WHERE NOT EXISTS (SELECT 1 FROM users WHERE discord_id = $1);`

		try {
			const res = await this.pool.query(insertOrUpdateQuery, [
				discord_id,
				github_username,
			])
			return true
		} catch (err) {
			return false
		}
	}

	getGithubUsername = async (discord_id) => {
		const query = 'select github_username from users where discord_id = $1'
		try {
			const res = await this.pool.query(query, [discord_id])
			return res.rows[0].github_username
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
