import promisifyRouter from 'express-promise-router'
import fetch from 'node-fetch'
import querystring from 'querystring'
import { usersManager } from '../../controllers/data-store'
import { discordStateManager } from '../../controllers/sessions'
import { AppSettings } from '../../server-utils'

export const createRegistrationLink = ((discord_id: string) => {
	const discordState = discordStateManager.create(discord_id)
	return `${AppSettings.baseURL}/auth/discord?discord_state=${discordState}`
})

export const router = promisifyRouter()

router.get('/', function (req, res) {
	if (!req.query.discord_state || typeof req.query.discord_state !== 'string') {
		res.status(400)
		throw new Error('Did not receive a discord state to begin authentication for')
	}

	const redirect_url =
		`https://github.com/login/oauth/authorize?` +
		querystring.encode({
			client_id: AppSettings.githubClientID,
			scope: '',
			redirect_uri: `${AppSettings.baseURL}/auth/discord/github_callback`,
			state: req.query.discord_state,
		})

	res.status(302).redirect(redirect_url)
})

router.get('/github_callback', async function (req, res) {
	if (!req.query.code || !req.query.state || typeof req.query.code !== 'string' || typeof req.query.state !== 'string') {
		res.status(400)
		throw new Error('OAuth callback did not receive all neccessary url parameters')
	}

	const discordState = await discordStateManager.pop(req.query.state)
	if (discordState === null) {
		throw new Error('The provided state does not match any recently generated')
	}

	const access_token_data = await fetch('https://github.com/login/oauth/access_token', {
		method: 'post',
		body: JSON.stringify({
			client_id: AppSettings.githubClientID,
			client_secret: AppSettings.githubClientSecret,
			code: req.query.code,
			state: req.query.state,
		}),
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
		},
	})
		.then(res => res.json())
		.catch(err => {
			console.log(err)
			throw new Error('Could not retrieve access token from GitHub')
		})

	const user_data = await fetch('https://api.github.com/user', {
		headers: {
			Accept: 'application/vnd.github.v3+json',
			Authorization: `token ${access_token_data.access_token}`,
		},
	})
		.then(res => res.json())
        .catch(err => {
            console.log(err)
			throw new Error('Failed to obtain user data')
		})
        .then(data => {
			if (data.message === 'Bad credentials') throw 'Bad Github credentials'
			return data
		})

	if (discordState && user_data.login) {
		usersManager.addUser(discordState, user_data.login)

		res.render('index', { title: 'Succesfully registered' })
	}
})
