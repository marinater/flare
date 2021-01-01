import * as fs from 'fs'
import * as path from 'path'
import * as querystring from 'querystring'
import { v4 as uuidv4 } from 'uuid'
import * as vscode from 'vscode'
import { constants } from './contstants'
import { Flare } from './flare'

export type Account =
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

	if (
		!data.email ||
		!data.sessionID ||
		!data.vscode_state ||
		!data.expiration
	) {
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

export class AccountOps {
	flare: Flare

	constructor(flare: Flare) {
		this.flare = flare
	}

	storeAccount = (account: Account) => {
		const filePath = vscode.Uri.file(
			path.join(this.flare.context.extensionPath, 'account.json')
		)
		this.flare.account = account

		try {
			console.log('wrote to file ' + JSON.stringify(account, null, 4))
			fs.writeFileSync(filePath.fsPath, JSON.stringify(account, null, 4))
			return true
		} catch {
			vscode.window.showErrorMessage(
				`Could not persist session to ${filePath.fsPath}`
			)
			return false
		}
	}

	restoreAccount = (): Account => {
		const filePath = vscode.Uri.file(
			path.join(this.flare.context.extensionPath, 'account.json')
		)

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
		vscode.env.openExternal(
			vscode.Uri.parse(
				`${constants.baseURL}/auth/vscode?vscode_state=${vscodeState}`
			)
		)
	}

	signOut = () => {
		vscode.window.showInformationMessage('logout complete')
		this.storeAccount({ signedIn: false })
	}
}
