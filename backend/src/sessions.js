var { v4: uuidV4 } = require('uuid')

const addHours = (hours) => {
	const currentDate = new Date()
	currentDate.setTime(currentDate.getTime() + hours * 60 * 60 * 1000)
	return currentDate
}

class VSCodeSessionManager {
	constructor() {
		this.sessions = {}
	}

	createSession = (email, vscodeState) => {
		const sessionID = uuidV4()

		const timeout = setTimeout(
			() => this.endSession(sessionID),
			process.env.SESSION_STATE_TIMEOUT_HOURS * 60 * 60 * 1000
		)

		this.sessions[sessionID] = {
			email,
			timeout,
			expiration: addHours(process.env.SESSION_STATE_TIMEOUT_HOURS),
		}

		return {
			email,
			sessionID,
			vscode_state: vscodeState,
			expiration: this.sessions[sessionID].expiration.toUTCString(),
		}
	}

	endSession = (uuid) => {
		if (uuid in this.sessions) {
			clearTimeout(this.sessions[uuid].timeout)

			delete this.sessions[uuid]
			return true
		}

		return false
	}
}

class OAuthStateManager {
	constructor() {
		this.states = {}
	}

	createState = (vscodeState) => {
		const githubState = uuidV4()

		const timeout = setTimeout(
			() => this.verifyState(githubState),
			process.env.GITHUB_STATE_TIMEOUT_MINS * 60 * 1000
		)

		this.states[githubState] = {
			vscodeState,
			timeout,
		}

		return githubState
	}

	verifyState = (githubState) => {
		if (githubState in this.states) {
			clearTimeout(this.states[githubState].timeout)

			const { vscodeState } = this.states[githubState]
			delete this.states[githubState]

			return vscodeState
		}

		return null
	}
}

module.exports = {
	vscodeSessionManager: new VSCodeSessionManager(),
	oauthStateManager: new OAuthStateManager(),
}
