// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as fs from 'fs';
import * as path from 'path';
import * as querystring from 'querystring';
import * as vscode from 'vscode';

const BASE_URL = 'https://localhost:8000';

type Account = {
    signedIn: true
    username: string
    token: string
    expiration: Date
} | {
    signedIn: false
};

const parseAccount = (data: any) => {
    let account: Account = { signedIn: false };

    if (!data.username || !data.token || !data.expiration) {
        return account;
    }

    const expiration = new Date(data.expiration);
    if (expiration < new Date()) {
        return account;
    }

    account = {
        signedIn: true,
        username: String(data.username),
        token: String(data.token),
        expiration
    };

    return account;
};

class AccountOps {
    static storeAccount = (context: vscode.ExtensionContext, account: Account) => {
        const filePath = vscode.Uri.file(path.join(context.extensionPath, 'views', 'index.html'));
        try {
            fs.writeFileSync(filePath.fsPath, JSON.stringify(account, null, 4));
            return true;
        }
        catch {
            vscode.window.showErrorMessage(`Could not save account info to ${filePath.fsPath}`);
            return false;
        }
    };

    static restoreAccount = (context: vscode.ExtensionContext): Account => {
        const filePath = vscode.Uri.file(path.join(context.extensionPath, 'views', 'index.html'));

        try {
            const document = fs.readFileSync(filePath.fsPath, 'utf8');
            return parseAccount(JSON.parse(document));
        }
        catch {
            const account: Account = { signedIn: false };
            AccountOps.storeAccount(context, account);
            return account;
        }
    };

    static uriAuthHandler = (context: vscode.ExtensionContext) => (uri: vscode.Uri) => {
        vscode.window.showInformationMessage("hello!");

        const queryParams = querystring.parse(uri.query);
        const account = parseAccount(queryParams);

        AccountOps.storeAccount(context, account);
    };

    static signIn = (context: vscode.ExtensionContext) => {
        vscode.env.openExternal(vscode.Uri.parse(`${BASE_URL}/auth`));
    };

    static signOut = (context: vscode.ExtensionContext) => {
        AccountOps.storeAccount(context, { signedIn: false });
    };
}

class Flare {
    context: vscode.ExtensionContext;
    account: Account;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.account = AccountOps.restoreAccount(context);
    }
}

const openFlare = (context: vscode.ExtensionContext) => () => {
    const panel = vscode.window.createWebviewPanel(
        'flare', // Identifies the type of the webview. Used internally
        'Flare', // Title of the panel displayed to the user
        vscode.ViewColumn.One, // Editor column to show the new webview panel in.
        {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.file(path.join(context.extensionPath, 'views'))
            ]
        }
    );

    const filePath = vscode.Uri.file(path.join(context.extensionPath, 'views', 'index.html'));
    panel.webview.html = fs.readFileSync(filePath.fsPath, 'utf8');
};

const startFlare = (context: vscode.ExtensionContext) => () => {

};

const stopFlare = (context: vscode.ExtensionContext) => () => {

};

export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.commands.registerCommand('flare.start', startFlare(context))
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('flare.stop', stopFlare(context))
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('flare.open', openFlare(context))
    );
    context.subscriptions.push(
        vscode.window.registerUriHandler({
            handleUri: AccountOps.uriAuthHandler(context)
        })
    );
}

export function deactivate() {}
