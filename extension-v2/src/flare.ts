import { v4 as uuidV4 } from 'uuid'
import * as vscode from 'vscode'
import { Account, AccountOps } from './account'

export class Flare {
	context: vscode.ExtensionContext
	account: Account
	accountOps: AccountOps

	public constructor(context: vscode.ExtensionContext) {
		this.context = context
		this.accountOps = new AccountOps(this)
		this.account = this.accountOps.restoreAccount()
	}

	public readonly login = () => {
		if (!this.account.signedIn) {
			vscode.window.showInformationMessage(
				'Please open the link and sign in to Github'
			)
			this.accountOps.signIn()
		} else {
			vscode.window.showInformationMessage(
				'Signed in as ' + this.account.email
			)
			this.open()
		}
	}

	public readonly logout = () => {
		if (this.account.signedIn) {
			this.accountOps.signOut()
			vscode.window.showInformationMessage('Signed out of Flare')
		} else {
			vscode.window.showInformationMessage(
				'You are already signed out of Flare'
			)
		}
	}

	public readonly open = () => {
		if (!this.account.signedIn) {
			this.login()
			return
		}

		const panel = vscode.window.createWebviewPanel(
			'flare',
			'Flare',
			vscode.ViewColumn.Two,
			{
				enableScripts: true,
				localResourceRoots: [
					vscode.Uri.joinPath(this.context.extensionUri, 'media'),
					vscode.Uri.joinPath(
						this.context.extensionUri,
						'out/compiled'
					),
				],
			}
		)

		panel.webview.html = this.getHtmlForWebview(panel.webview)
	}

	private getHtmlForWebview(webview: vscode.Webview) {
		const scriptUri = webview.asWebviewUri(
			vscode.Uri.joinPath(
				this.context.extensionUri,
				'out/compiled',
				'Discord.js'
			)
		)

		const stylesResetUri = webview.asWebviewUri(
			vscode.Uri.joinPath(this.context.extensionUri, 'media', 'reset.css')
		)

		const stylesMainUri = webview.asWebviewUri(
			vscode.Uri.joinPath(
				this.context.extensionUri,
				'media',
				'vscode.css'
			)
		)

		// const cssUri = webview.asWebviewUri(
		//   vscode.Uri.joinPath(this._extensionUri, "out", "compiled/swiper.css")
		// );

		// // Use a nonce to only allow specific scripts to be run
		const nonce = uuidV4()

		return `
            <!DOCTYPE html>
            <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <!--
                        Use a content security policy to only allow loading images from https or from our extension directory,
                        and only allow scripts that have a specific nonce.
                    -->
                    <meta http-equiv="Content-Security-Policy" content="img-src https: data:; style-src 'unsafe-inline' ${webview.cspSource}; script-src 'nonce-${nonce}';">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <link href="${stylesResetUri}" rel="stylesheet">
                    <link href="${stylesMainUri}" rel="stylesheet">
                    <script nonce="${nonce}">
                    </script>
                </head>
                <body>
    			</body>
                <script src="${scriptUri}" nonce="${nonce}">
			</html>`
	}
}
