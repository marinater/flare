require('dotenv').config({ path: '/backend/envs/backend.env' })

var http = require('http')
var createError = require('http-errors')
var express = require('express')
var path = require('path')
var cookieParser = require('cookie-parser')
var logger = require('morgan')

var { router: discordAuthRouter } = require('./routes/auth/discord')
var { router: vscodeAuthRouter } = require('./routes/auth/vscode')
var { router: indexRouter } = require('./routes/index')
var serverUtils = require('./server-utils')
var FlareBot = require('./flarebot')

var app = express()

var port = serverUtils.normalizePort(process.env.PORT || '3000')
app.set('port', port)

// view engine setup
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'pug')

app.use(logger('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())
app.use(express.static(path.join(__dirname, 'public')))

app.use('/auth/discord', discordAuthRouter)
app.use('/auth/vscode', vscodeAuthRouter)
app.use('/', indexRouter)

// catch 404 and forward to error handler
app.use(function (req, res, next) {
	next(createError(404))
})

// error handler
app.use(function (err, req, res, next) {
	// set locals, only providing error in development
	res.locals.message = err.message
	res.locals.error = req.app.get('env') === 'development' ? err : {}

	// render the error page
	res.status(err.status || 500)
	res.render('error')
})

var server = http.createServer(app)
const io = require('socket.io')(server, {
	cors: {
		origin: '*',
	},
})

const flareBot = new FlareBot(io)
if (process.env.ENABLE_DISCORD_BOT === 'true') {
	flareBot.start()
}

server.listen(port)
server.on('error', serverUtils.onError(port))
server.on('listening', serverUtils.onListening(server))
