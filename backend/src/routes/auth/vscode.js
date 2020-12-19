var express = require('express')
var router = require('express-promise-router')()

var querystring = require('querystring')
var fetch = require('node-fetch')

var { vscodeSessionManager, oauthStateManager } = require('../../sessions')

router.get('/', function (req, res, next) {
	if (!req.query.vscode_state) {
		res.status(400)
		throw new Error('VS Code did not provide origination state')
	}

	const redirect_url =
		`https://github.com/login/oauth/authorize?` +
		querystring.encode({
			client_id: process.env.GITHUB_CLIENT_ID,
			scope: '',
			state: oauthStateManager.createState(req.query.vscode_state),
		})

	res.status(302).redirect(redirect_url)
})

router.get('/github_callback', async function (req, res, next) {
	if (!req.query.code || !req.query.state) {
		res.status(400)
		throw new Error(
			'OAuth callback did not receive all neccessary url parameters'
		)
	}

	const vscodeState = oauthStateManager.verifyState(req.query.state)
	if (vscodeState === null) {
		throw new Error(
			'The provided state does not match any recently generated'
		)
	}

	const access_token_data = await fetch(
		'https://github.com/login/oauth/access_token',
		{
			method: 'post',
			body: JSON.stringify({
				client_id: process.env.GITHUB_CLIENT_ID,
				client_secret: process.env.GITHUB_CLIENT_SECRET,
				code: req.query.code,
				state: req.query.state,
			}),
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
			},
		}
	)
		.then((res) => res.json())
		.catch((err) => {
			console.log(err)
			throw new Error('Could not retrieve access token from GitHub')
		})

	console.log(access_token_data)

	const user_data = await fetch('https://api.github.com/user', {
		headers: {
			Accept: 'application/vnd.github.v3+json',
			Authorization: `token ${access_token_data.access_token}`,
		},
	})
		.then((res) => res.json())
		.then((data) => {
			if (data.message === 'Bad credentials')
				throw 'Bad Github credentials'
			else return data
		})
		.catch(() => {
			throw new Error('Failed to obtain user data')
		})

	const session = vscodeSessionManager.createSession(user_data.email)
	res.redirect('vscode://marinater.flare/auth?' + querystring.encode(session))
})

router.post('/', function (req, res, next) {
	if (!req.body.username || !req.body.password || !req.body) {
		res.status(400)
		throw new Error('Form POST did not contain username and password')
	}

	const session = vscodeSessionManager.createSession()
	res.send(session)
})

module.exports = router
