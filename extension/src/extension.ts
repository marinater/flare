// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as fs from 'fs';
import * as path from 'path';
import * as querystring from 'querystring';
import { v4 as uuidv4 } from 'uuid';
import * as vscode from 'vscode';

const BASE_URL = 'http://localhost:3000';

type Account = {
    signedIn: true
    email: string
    token: string
    expiration: Date
} | {
    signedIn: false
};

let vscodeState = uuidv4();

const validateQueryParams = (data: any) => {
    let account: Account = { signedIn: false };

    if (!data.email || !data.sessionID || !data.vscodeState || !data.expiration) {
        return account;
    }

    if (vscodeState !== data.vscodeState) {
        return account;
    }

    const expiration = new Date(data.expiration);
    if (expiration < new Date()) {
        return account;
    }

    account = {
        signedIn: true,
        email: String(data.username),
        token: String(data.token),
        expiration
    };

    return account;
};

class AccountOps {
    flare: Flare;

    constructor(flare: Flare) {
        this.flare = flare;
    }

    storeAccount = (account: Account) => {
        const filePath = vscode.Uri.file(path.join(this.flare.context.extensionPath, 'account.json'));
        try {
            fs.writeFileSync(filePath.fsPath, JSON.stringify(account, null, 4));
            return true;
        }
        catch {
            vscode.window.showErrorMessage(`Could not save account info to ${filePath.fsPath}`);
            return false;
        }
    };

    restoreAccount = (): Account => {
        const filePath = vscode.Uri.file(path.join(this.flare.context.extensionPath, 'account.json'));

        try {
            const document = fs.readFileSync(filePath.fsPath, 'utf8');
            return validateQueryParams(JSON.parse(document));
        }
        catch {
            const account: Account = { signedIn: false };
            this.storeAccount(account);
            return account;
        }
    };

    uriAuthHandler = (uri: vscode.Uri) => {
        const queryParams = querystring.decode(uri.query);
        const account = validateQueryParams(queryParams);
        if (!account.signedIn) {
            vscode.window.showErrorMessage('Authentication callback failed');
        }

        vscodeState = uuidv4();
        this.storeAccount(account);
    };

    signIn = () => {
        vscode.env.openExternal(vscode.Uri.parse(`${BASE_URL}/auth/vscode?vscode_state=${vscodeState}`));
    };

    signOut = () => {
        this.storeAccount({ signedIn: false });
    };
}

class Flare {
    context: vscode.ExtensionContext;
    account: Account;
    accountOps: AccountOps;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.accountOps = new AccountOps(this);
        this.account = this.accountOps.restoreAccount();
    }

    open = () => {
        const panel = vscode.window.createWebviewPanel(
            'flare', // Identifies the type of the webview. Used internally
            'Flare', // Title of the panel displayed to the user
            vscode.ViewColumn.One, // Editor column to show the new webview panel in.
            {
                enableScripts: true,
                localResourceRoots: [
                    vscode.Uri.file(path.join(this.context.extensionPath, 'views'))
                ]
            }
        );

        const filePath = vscode.Uri.file(path.join(this.context.extensionPath, 'views', 'index.html'));
        panel.webview.html = fs.readFileSync(filePath.fsPath, 'utf8');
    };

    start = () => {
        this.accountOps.signIn();
    };

    stop = () => {
        this.accountOps.signOut();
    };
}

export function activate(context: vscode.ExtensionContext) {
    const flare = new Flare(context);

    context.subscriptions.push(
        vscode.commands.registerCommand('flare.start', flare.start)
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('flare.stop', flare.stop)
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('flare.open', flare.open)
    );
    context.subscriptions.push(
        vscode.window.registerUriHandler({
            handleUri: flare.accountOps.uriAuthHandler
        })
    );
}

export function deactivate() {}
