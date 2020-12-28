import type { Server } from 'http'

var debug = require('debug')('flare:server')

interface AppSettings {
	discordToken: string
	githubClientID: string
	githubClientSecret: string
	oauthStateTimeoutSeconds: number
	sessionStateTimeoutHours: number
	baseURL: string
	loggingLevel: 'dev' | 'short' | 'tiny'
	databaseURL: string
	redisURL: string
	port: number
	nodeENV: 'development' | 'production'
	enableFlareBot: boolean
}

const getStringSetting = (settingName: string, fallback?: string) => {
	if (process.env[settingName]) return process.env[settingName] as string
	if (fallback) return fallback

	throw new Error(`Could not retrieve required env variable: ${settingName}`)
}

const getStringOptionsSetting = (
	settingName: string,
	options: string[],
	fallback?: string
) => {
	if (process.env[settingName]) {
		if (options.includes(process.env[settingName] as string))
			return process.env[settingName] as string

		console.warn(
			`Env var ${settingName} is set but does not match an acceptable value`
		)
	}

	if (fallback) return fallback

	throw new Error(`Could not retrieve required env variable: ${settingName}`)
}

const getNumericSetting = (settingName: string, fallback?: number) => {
	if (process.env[settingName]) {
		const parsed = new Number(process.env[settingName] as string)
		if (parsed !== NaN) {
			return parsed.valueOf()
		}

		console.warn(
			`Env var ${settingName} is set but does not match an acceptable value`
		)
	}

	if (fallback) return fallback

	throw new Error(`Could not retrieve required env variable: ${settingName}`)
}

const getBooleanSetting = (settingName: string, fallback?: boolean) => {
	const value = process.env[settingName]
	if (value) {
		if (value === 'true' || value === 'false') {
			return value === 'true'
		}

		console.warn(
			`Env var ${settingName} is set but does not match an acceptable value`
		)
	}

	if (fallback !== undefined) return fallback

	throw new Error(`Could not retrieve required env variable: ${settingName}`)
}

const getAppSettings = (): AppSettings => {
	return {
		discordToken: getStringSetting('DISCORD_TOKEN'),
		githubClientID: getStringSetting('GITHUB_CLIENT_ID'),
		githubClientSecret: getStringSetting('GITHUB_CLIENT_SECRET'),
		oauthStateTimeoutSeconds: getNumericSetting(
			'OAUTH_STATE_TIMEOUT_SECONDS'
		),
		sessionStateTimeoutHours: getNumericSetting(
			'SESSION_STATE_TIMEOUT_HOURS'
		),
		baseURL: getStringSetting('BASE_URL'),
		loggingLevel: getStringOptionsSetting(
			'LOGGING_LEVEL',
			['dev', 'short', 'tiny'],
			'dev'
		) as 'dev' | 'short' | 'tiny',
		databaseURL: getStringSetting('DATABASE_URL'),
		redisURL: getStringSetting('REDIS_URL'),
		port: getNumericSetting('PORT', 3000),
		nodeENV: getStringOptionsSetting(
			'NODE_ENV',
			['development', 'production'],
			'development'
		) as 'development' | 'production',
		enableFlareBot: getBooleanSetting('ENABLE_FLARE_BOT'),
	}
}

export const AppSettings = getAppSettings()
console.log(AppSettings)
export const onError = (error: NodeJS.ErrnoException) => {
	if (error.syscall !== 'listen') {
		throw error
	}

	// handle specific listen errors with friendly messages
	switch (error.code) {
		case 'EACCES':
			console.error(AppSettings.port + ' requires elevated privileges')
			process.exit(1)
			break
		case 'EADDRINUSE':
			console.error(AppSettings.port + ' is already in use')
			process.exit(1)
			break
		default:
			throw error
	}
}

export const onListening = (server: Server) => () => {
	debug(`Listening on ${server.address()}`)
}
