import redis from 'redis'
import { promisify } from 'util'
import { v4 as uuidV4 } from 'uuid'
import { AppSettings } from '../server-utils'

export const client = redis.createClient({
	url: process.env.REDIS_URL,
})

export const addSeconds = (seconds: number) => {
	const currentDate = new Date()
	currentDate.setTime(currentDate.getTime() + seconds * 1000)
	return currentDate
}

export const makeRedisKey = (prefix: string) => (key: string) => `${prefix}:${key}`

export class SessionManager {
    timeoutSeconds: number
    makeSessionMapKey: (key: string) => string

    constructor(prefix: string, timeoutSeconds: number) {
        this.timeoutSeconds = timeoutSeconds
        this.makeSessionMapKey = makeRedisKey(prefix)
	}

	create = (verification_code: string) => {
		const sessionID = uuidV4()

		client.set(this.makeSessionMapKey(sessionID), verification_code, 'EX', this.timeoutSeconds)

		return sessionID
	}

	verify = (sessionID: string) => {
		const promisifiedGet = promisify(client.get).bind(client)

		return promisifiedGet(this.makeSessionMapKey(sessionID)).catch(() => null)
	}

	delete = (sessionID: string) => {
		const promisifiedDel = promisify(client.del).bind(client)

        //@ts-ignore
		return promisifiedDel(this.makeSessionMapKey(sessionID))
        .catch(() => false)
        .then(reply => reply > 0)
	}

	pop = (sessionID: string) => {
		const multi = client.multi().get(this.makeSessionMapKey(sessionID)).del(this.makeSessionMapKey(sessionID))

		const promisifiedPop = promisify(multi.exec).bind(multi)

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

export const vscodeSessionManager = new SessionManager('vscode_session_manager', AppSettings.sessionStateTimeoutHours * 60 * 60)
export const vscodeStateManager = new SessionManager('vscode_state_manager', AppSettings.oauthStateTimeoutSeconds)
export const discordStateManager = new SessionManager('discord_state_manager', AppSettings.oauthStateTimeoutSeconds)
