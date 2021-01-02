<script lang="ts">
	import { handlers, activeChannel, activeGuild } from '../sockets'

	$: placeholder = $activeChannel?.name
		? `Message #${$activeChannel!.name}`
		: 'Run !link inside the server you want to receive updates for!'

	let inputValue: string

	const onKeyPress: svelte.JSX.EventHandler<KeyboardEvent, HTMLInputElement> = event => {
		if (event.keyCode !== 13) {
			return
		}

		if (!$activeChannel && !$activeGuild) {
			return
		}

		const retMessage = {
			channelID: $activeChannel!.id,
			guildID: $activeGuild!.id,
			content: inputValue
		}

		handlers.postMessage(retMessage)
		inputValue = ''
	}
</script>

<style>
	input {
		flex: none;
		width: 100%;
		height: 44px;
		background-color: var(--vscode-input-background);
		border-radius: 8px;
		border: 2px solid var(--vscode-button-secondaryBackground);
		outline: none;
		padding-left: 20px;
		color: var(--vscode-input-foreground);
		transition: 0.25s ease-out;
	}

	input:hover {
		border-color: var(--vscode-button-secondaryHoverBackground);
	}

	input:focus {
		border-color: var(--vscode-button-background);
		transition: 0.25s ease-out;
	}
</style>

<input {placeholder} on:keypress={onKeyPress} bind:value={inputValue} />
