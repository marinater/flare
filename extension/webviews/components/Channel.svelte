<script lang="ts">
	import type { ChannelInfo } from '../user-types'

	export let channelInfo: ChannelInfo
	export let selected: boolean
	export let onclick: () => void

	$: showNotification = channelInfo.unread > 0
</script>

<style>
	.root {
		border-radius: 3px;
		margin-bottom: 6px;
		padding: 5px 10px;
		position: relative;
		color: var(--vscode-debugIcon-breakpointDisabledForeground);
	}

	.background-highlight,
	.root:hover {
		background-color: var(--vscode-editor-selectionBackground);
		cursor: pointer;
	}

	.text-highlight {
		color: var(--vscode-editor-foreground);
	}

	.notification-dot {
		background-color: var(--vscode-minimap-errorHighlight);
		border-radius: 50%;
		position: absolute;
		left: 0;
		top: calc(50% - 6px);
		transform: translate(calc(-50% - 12px), 0%);
		height: 12px;
		width: 12px;
	}
</style>

<div
	class="root
        {selected ? 'background-highlight' : ''}
        {showNotification || selected ? 'text-highlight' : ''}
    "
	on:click={onclick}
>
	<span class="channel-name-text"> # {channelInfo.name} </span>
	{#if showNotification}<span class="notification-dot" />{/if}
</div>
