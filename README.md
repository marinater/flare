# Flare

#### Discord integration for VS Code

---

## Features

-   Send and receive messages from your Discord servers
-   Same intuitive layout as Discord within a VS Code editor tab
-   Themeing matches your active VS Code theme
-   Sign in with Github

## Usage

### Server Admins

-   Add Flare to your server with [this
    link](https://discord.com/api/oauth2/authorize?client_id=789273278723391489&permissions=117760&scope=bot)
    (requires server admin permissions)

### General Users

-   Send the following message on any server with Flare added. Flare will DM a
    link that will ask you to sign in with Github. You will have to use this
    Github account again when signing in to our VS Code extension

```
!link
```

-   Send the following message on any server with Flare added to have messages
    forwarded to your VS Code extension. Server messages are not forwarded until
    you send this command to that specific server

```
!connect
```

-   Install the VS Code Extension by searching for it inside the app (app name is
    'Flare' and published by 'marinater') or with [this link](https://marketplace.visualstudio.com/items?itemName=marinater.flare)
-   Launch Flare
    1. Open the command palette [ctrl + shift + p] or [View ->
       Command Palette]
    2. Search "Open Flare" and press enter
    3. Accept the request to open an external link, which will open in a browser
    4. Sign in with Github
    5. Accept the request to open VS Code
    6. A new tab labeled "Flare" should be created that mimic's Discord's
       layout. Servers you have `!connect`ed will appear on the left. If the
       area is empty, try going back to Discord, `!connect`ing a server, and
       reopening the extension.

---

#### Made by Samarth Patel and Derek Li with ❤️
