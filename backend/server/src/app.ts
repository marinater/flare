require('dotenv').config({ path: '/backend/envs/backend.env' })

import cookieParser from 'cookie-parser'
import express, { ErrorRequestHandler } from 'express'
import http from 'http'
import createError from 'http-errors'
import logger from 'morgan'
import path from 'path'
import { Server } from 'socket.io'
import { FlareBot } from './flarebot'
// import { FlareBot } from './flarebot'
import { router as discordAuthRouter } from './routes/auth/discord'
import { router as vscodeAuthRouter } from './routes/auth/vscode'
import { AppSettings, onError, onListening } from './server-utils'

// const FlareBot = require('./flarebot')
const port = process.env.PORT || '3000'
const app = express()

app.set('port', port)

// view engine setup
app.set('views', path.join(__dirname, '../views'))
app.set('view engine', 'pug')

app.use(logger('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())
app.use(express.static(path.join(__dirname, 'public')))

app.use('/auth/discord', discordAuthRouter)
app.use('/auth/vscode', vscodeAuthRouter)

// catch 404 and forward to error handler
app.use(function (_req, _res, next) {
	next(createError(404))
})

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
	// set locals, only providing error in development
	res.locals.message = err.message
	res.locals.error = AppSettings.nodeENV ? err : {}

	// render the error page
	res.status(err.status || 500)
	res.render('error')
}
app.use(errorHandler)

const server = http.createServer(app)
const io = new Server(server, {
	cors: {
		origin: '*',
	},
})

const flareBot = new FlareBot(io)
if (AppSettings.enableFlareBot) {
	flareBot.start()
}

server.listen(port)
server.on('error', onError)
server.on('listening', onListening(server))
