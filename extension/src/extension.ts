// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode'
import { Flare } from './flare'

export function activate(context: vscode.ExtensionContext) {
	const flare = new Flare(context)

	context.subscriptions.push(
		vscode.commands.registerCommand('flare.logout', flare.logout)
	)
	context.subscriptions.push(
		vscode.commands.registerCommand('flare.open', flare.open)
	)

	context.subscriptions.push(
		vscode.window.registerUriHandler({
			handleUri: flare.accountOps.uriAuthHandler(flare.open),
		})
	)
}

export function deactivate() {}
