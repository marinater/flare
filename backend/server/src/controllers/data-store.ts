import { Pool } from 'pg'
import { AppSettings } from '../server-utils'

class UsersManager {
    pool: Pool = new Pool({
			connectionString: AppSettings.databaseURL,
	})

	addUser = (discord_id: string, github_username: string) => {
		const statement = 'insert into users (discord_id, github_username) values ($1, $2) on conflict (discord_id) do update set discord_id = $1, github_username = $2'

		return this.pool
			.query(statement, [discord_id, github_username])
			.then(() => true)
			.catch(err => {
				console.error(err)
				return false
			})
	}

	storeGuildId = (guild_id: string) => {
		const statement = 'insert into guilds (guild_id) values ($1) on conflict (guild_id) do nothing'

		return this.pool
			.query(statement, [guild_id])
			.then(() => true)
			.catch(err => {
				console.error(err)
				return false
			})
	}

	removeGuildId = (guild_id: string) => {
		const statement = 'delete from guilds where guild_id = ($1)'

		return this.pool
			.query(statement, [guild_id])
			.then(() => true)
			.catch(err => {
				console.error(err)
				return false
			})
	}

	addGuildUserAssociation = (guild_id: string, discord_id: string) => {
		const statement = 'insert into guilds_users (guild_id, discord_id) values ($1, $2) on conflict (guild_id, discord_id) do nothing'

		return this.pool
			.query(statement, [guild_id, discord_id])
			.then(() => true)
			.catch(err => {
				console.error(err)
				return false
			})
	}

	removeGuildUserAssociation = (guild_id: string, discord_id: string) => {
		const statement = 'delete from guilds_users where guild_id = ($1) and discord_id = ($2)'

		return this.pool
			.query(statement, [guild_id, discord_id])
			.then(() => true)
			.catch(err => {
				console.error(err)
				return false
			})
	}

	getGuildsFromUserAssociation = (discord_id: string) => {
		const statement = 'select guild_id from guilds_users where discord_id = $1'

		return this.pool
			.query(statement, [discord_id])
			.then(res => res.rows.map(x => x.guild_id))
			.catch(() => null)
	}

	getUsersFromGuildAssociation = (guild_id: string) => {
		const statement = 'select discord_id from guilds_users where guild_id = $1'

		return this.pool
			.query(statement, [guild_id])
			.then(res => res.rows)
			.catch(() => null)
	}

	getGithubUsername = async (discord_id: string) => {
		const statement = 'select github_username from users where discord_id = $1'

		return this.pool
			.query(statement, [discord_id])
			.then(res => res.rows[0].github_username)
			.catch(() => null)
	}

	getDiscordID = async (github_username: string) => {
		const statement = 'select discord_id from users where github_username = $1'

		return this.pool
			.query(statement, [github_username])
			.then(res => res.rows[0].discord_id)
			.catch(() => null)
	}

	getAllUsers = async () => {
		const statement = 'select * from guilds_users'

		return this.pool
			.query(statement)
			.then(res => res.rows)
			.catch(() => null)
	}

	stop = () => {
		this.pool.end()
	}
}

export const usersManager = new UsersManager()
