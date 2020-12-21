const e = require('express')
const { vscodeSessionManager } = require('./sessions')

class SocketManager {
	constructor(io, messageHandler) {
		const sessionID = vscodeSessionManager.create('marinater')
		console.log(sessionID)

		this.mappings = {}

		io.use((socket, next) => {
			const sessionID = socket.handshake.auth.sessionID

			if (!sessionID) {
				next(new Error('Socket did not provide a session id'))
				return
			}

			vscodeSessionManager.verify(sessionID).then((verified) => {
				if (verified) next()
				else
					next(
						new Error(
							'Socket sessionID does not match a recently created session'
						)
					)
			})
		})

		io.on('connection', (socket) => {
			socket.on('flare-message', messageHandler)
		})

		// take as arg discord id and message -> send message to client

		// listen on sockets and forward messages to handler
	}

	sendMessage = (discordID, message) => {}
}

module.exports = { SocketManager }
