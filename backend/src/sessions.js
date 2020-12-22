var { v4: uuidV4 } = require('uuid')
const util = require('util')

const redis = require('redis')
const client = redis.createClient({
	url: process.env.REDIS_URL,
})

const addSeconds = seconds => {
	const currentDate = new Date()
	currentDate.setTime(currentDate.getTime() + seconds * 1000)
	return currentDate
}

const makeRedisKey = prefix => key => `${prefix}:${key}`

class SessionManager {
	constructor(prefix, timeoutSeconds) {
		this.timeoutSeconds = timeoutSeconds
		this.makeSessionMapKey = makeRedisKey(prefix)
	}

	create = verification_code => {
		const sessionID = uuidV4()

		client.set(this.makeSessionMapKey(sessionID), verification_code, 'EX', this.timeoutSeconds)

		return sessionID
	}

	verify = sessionID => {
		const promisifiedGet = util.promisify(client.get).bind(client)

		return promisifiedGet(this.makeSessionMapKey(sessionID)).catch(() => null)
	}

	delete = sessionID => {
		const promisifiedDel = util.promisify(client.del).bind(client)

		return promisifiedDel(this.makeSessionMapKey(sessionID))
			.then(reply => reply > 0)
			.catch(() => false)
	}

	pop = sessionID => {
		const multi = client.multi().get(this.makeSessionMapKey(sessionID)).del(this.makeSessionMapKey(sessionID))

		const promisifiedPop = util.promisify(multi.exec).bind(multi)

		return promisifiedPop()
			.then(replies => {
				return replies[0]
			})
			.catch(err => {
				console.error(err)
				return null
			})
	}
}

module.exports = {
	vscodeSessionManager: new SessionManager('vscode_session_manager', process.env.SESSION_STATE_TIMEOUT_HOURS * 60 * 60),
	vscodeStateManager: new SessionManager('vscode_state_manager', process.env.OAUTH_STATE_TIMEOUT_SECONDS),
	discordStateManager: new SessionManager('discord_state_manager', process.env.OAUTH_STATE_TIMEOUT_SECONDS),
	addSeconds,
	redisClient: client,
	makeRedisKey: prefix => key => `${prefix}:${key}`,
}
