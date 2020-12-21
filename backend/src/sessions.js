var { v4: uuidV4 } = require('uuid')
const util = require('util')

const redis = require('redis')
const client = redis.createClient({
	host: 'redis',
})

const addSeconds = (seconds) => {
	const currentDate = new Date()
	currentDate.setTime(currentDate.getTime() + seconds * 1000)
	return currentDate
}

class SessionManager {
	constructor(prefix, timeoutSeconds) {
		this.prefix = prefix
		this.timeoutSeconds = timeoutSeconds
	}

	create = (verification_code) => {
		const sessionID = uuidV4()

		client.set(
			`${this.prefix}:${sessionID}`,
			verification_code,
			'EX',
			this.timeoutSeconds
		)

		return sessionID
	}

	verify = (sessionID) => {
		const promisifiedGet = util.promisify(client.get).bind(client)

		return promisifiedGet(`${this.prefix}:${sessionID}`).catch(() => null)
	}

	delete = (sessionID) => {
		const promisifiedDel = util.promisify(client.del).bind(client)

		return promisifiedDel(`${this.prefix}:${sessionID}`)
			.then((reply) => reply > 0)
			.catch(() => false)
	}

	pop = (sessionID) => {
		const multi = client
			.multi()
			.get(`${this.prefix}:${sessionID}`)
			.del(`${this.prefix}:${sessionID}`)

		const promisifiedPop = util.promisify(multi.exec).bind(multi)

		return promisifiedPop()
			.then((replies) => {
				return replies[0]
			})
			.catch((err) => {
				console.error(err)
				return null
			})
	}
}

module.exports = {
	vscodeSessionManager: new SessionManager(
		'vscode_session_manager',
		process.env.SESSION_STATE_TIMEOUT_HOURS * 60 * 60
	),
	vscodeStateManager: new SessionManager(
		'vscode_state_manager',
		process.env.OAUTH_STATE_TIMEOUT_SECONDS
	),
	discordStateManager: new SessionManager(
		'discord_state_manager',
		process.env.OAUTH_STATE_TIMEOUT_SECONDS
	),
	addSeconds,
}
