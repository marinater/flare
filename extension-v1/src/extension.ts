// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as fs from 'fs'
import * as path from 'path'
import * as querystring from 'querystring'
import { v4 as uuidv4 } from 'uuid'
import * as vscode from 'vscode'

const BASE_URL = 'http://localhost:3000'
// const BASE_URL = 'https://discord-flare.herokuapp.com';

type Account =
	| {
			signedIn: true
			email: string
			sessionID: string
			expiration: Date
	  }
	| {
			signedIn: false
	  }

let vscodeState = uuidv4()

const validateQueryParams = (data: any) => {
	let account: Account = { signedIn: false }

	if (!data.email || !data.sessionID || !data.vscode_state || !data.expiration) {
		return account
	}

	if (vscodeState !== data.vscode_state) {
		return account
	}

	const expiration = new Date(data.expiration)
	if (expiration < new Date()) {
		return account
	}

	account = {
		signedIn: true,
		email: String(data.email),
		sessionID: String(data.sessionID),
		expiration,
	}

	return account
}

class AccountOps {
	flare: Flare

	constructor(flare: Flare) {
		this.flare = flare
	}

	storeAccount = (account: Account) => {
		const filePath = vscode.Uri.file(path.join(this.flare.context.extensionPath, 'account.json'))
		this.flare.account = account

		try {
			console.log('wrote to file ' + JSON.stringify(account, null, 4))
			fs.writeFileSync(filePath.fsPath, JSON.stringify(account, null, 4))
			return true
		} catch {
			vscode.window.showErrorMessage(`Could not persist session to ${filePath.fsPath}`)
			return false
		}
	}

	restoreAccount = (): Account => {
		const filePath = vscode.Uri.file(path.join(this.flare.context.extensionPath, 'account.json'))

		try {
			const document = fs.readFileSync(filePath.fsPath, 'utf8')
			return validateQueryParams(JSON.parse(document))
		} catch {
			const account: Account = { signedIn: false }
			this.storeAccount(account)
			return account
		}
	}

	uriAuthHandler = (callback: () => void) => (uri: vscode.Uri) => {
		const queryParams = querystring.decode(uri.query)

		const account = validateQueryParams(queryParams)
		if (!account.signedIn) {
			vscode.window.showErrorMessage('Authentication callback failed')
		}

		vscodeState = uuidv4()
		this.storeAccount(account)

		vscode.window.showInformationMessage('Flare authentication complete!')

		callback()
	}

	signIn = () => {
		vscode.env.openExternal(vscode.Uri.parse(`${BASE_URL}/auth/vscode?vscode_state=${vscodeState}`))
	}

	signOut = () => {
		vscode.window.showInformationMessage('logout complete')
		this.storeAccount({ signedIn: false })
	}
}

class Flare {
	context: vscode.ExtensionContext
	account: Account
	accountOps: AccountOps

	constructor(context: vscode.ExtensionContext) {
		this.context = context
		this.accountOps = new AccountOps(this)
		this.account = this.accountOps.restoreAccount()
	}

	open = () => {
		if (!this.account.signedIn) {
			this.login()
			return
		}

		const panel = vscode.window.createWebviewPanel(
			'flare', // Identifies the type of the webview. Used internally
			'Flare', // Title of the panel displayed to the user
			vscode.ViewColumn.One, // Editor column to show the new webview panel in.
			{
				enableScripts: true,
				localResourceRoots: [vscode.Uri.file(path.join(this.context.extensionPath, 'views'))],
			}
		)

		const filePath = vscode.Uri.file(path.join(this.context.extensionPath, 'views', 'index.html'))

		let webViewHTML = fs.readFileSync(filePath.fsPath, 'utf8')
		webViewHTML = webViewHTML.replace(/{{sessionID}}/g, this.account.sessionID)

		webViewHTML = webViewHTML.replace(/{{base_url}}/g, BASE_URL)

		const onDiskViewsPath = vscode.Uri.file(path.join(this.context.extensionPath, 'views'))
		const webURIViewsPath = panel.webview.asWebviewUri(onDiskViewsPath).toString()

		webViewHTML = webViewHTML.replace(/{{views_path}}/g, webURIViewsPath)

		panel.webview.html = webViewHTML
	}

	login = () => {
		if (!this.account.signedIn) {
			vscode.window.showInformationMessage('Please open the link and sign in to Github')
			this.accountOps.signIn()
		} else {
			vscode.window.showInformationMessage('Signed in as ' + this.account.email)
			this.open()
		}
	}

	logout = () => {
		if (this.account.signedIn) {
			this.accountOps.signOut()
			vscode.window.showInformationMessage('Signed out of Flare')
		} else {
			vscode.window.showInformationMessage('You are already signed out of Flare')
		}
	}
}

export function activate(context: vscode.ExtensionContext) {
	const flare = new Flare(context)

	context.subscriptions.push(vscode.commands.registerCommand('flare.logout', flare.logout))
	context.subscriptions.push(vscode.commands.registerCommand('flare.open', flare.open))

	context.subscriptions.push(
		vscode.window.registerUriHandler({
			handleUri: flare.accountOps.uriAuthHandler(flare.open),
		})
	)
}

export function deactivate() {}
