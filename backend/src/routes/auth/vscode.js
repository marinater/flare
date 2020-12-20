var express = require('express')
var router = require('express-promise-router')()

var querystring = require('querystring')
var fetch = require('node-fetch')

var { vscodeSessionManager, vscodeStateManager } = require('../../sessions')

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
			redirect_uri: `${process.env.BASE_URL}/auth/vscode/github_callback`,
			state: vscodeStateManager.createState(req.query.vscode_state),
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

	const vscodeState = vscodeStateManager.verifyState(req.query.state)
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

	const session = vscodeSessionManager.createSession(
		user_data.login,
		vscodeState
	)
	res.redirect('vscode://marinater.flare/auth?' + querystring.encode(session))
})

module.exports = { router }
