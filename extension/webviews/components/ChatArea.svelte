<script lang="ts">
	import ChatInput from './ChatInput.svelte'
	import ChatMessage from './ChatMessage.svelte'
	import { afterUpdate, beforeUpdate } from 'svelte'
	import { activeChannel } from '../sockets'

	$: messages = $activeChannel?.messages || null

	let div: HTMLDivElement
	let autoscroll: boolean

	const setAutoScroll = () => {
		autoscroll = div && div.offsetHeight + div.scrollTop > div.scrollHeight - 20
	}

	$: onClick = () => {
		div.scrollTo(0, div.scrollHeight)
	}

	beforeUpdate(setAutoScroll)

	afterUpdate(() => {
		if (autoscroll) div.scrollTo(0, div.scrollHeight)
	})
</script>

<style>
	.root {
		flex: 1 0 0;
		padding: 20px;

		display: flex;
		flex-direction: column;
		align-items: stretch;
	}

	.message-list {
		width: 100%;
		flex: 1;
		overflow-y: scroll;

		display: flex;
		flex-direction: column;
		flex-flow: column nowrap;

		white-space: normal;
		hyphens: auto;
		word-break: break-word;

		padding-right: 53px;
	}

	.message-list > :global(:first-child) {
		margin-top: auto !important;
	}

	.message-list-tail {
		flex: 0 0 20px;
	}

	.footer {
		position: relative;
		z-index: 1000;
	}

	.autoscroll-indicator {
		height: 35px;
		width: 100%;
		position: absolute;
		top: -30px;
		border: none;
		outline: none;

		z-index: -1;
		padding: 3px 10px;
		border-radius: 8px 8px 0px 0px;
		background-color: var(--vscode-sideBar-background);
		color: var(--vscode-editor-foreground);

		cursor: pointer;
	}

	.jump-to-present-button {
		position: absolute;
		font-size: 13.33px;
		padding: 7px 15px;
		right: 0px;
		top: 0px;
	}

	.older-messages-text {
		position: absolute;
		font-size: 13.33px;
		padding: 7px 15px;
		left: 0px;
		top: 0px;
	}
</style>

<div class="root">
	<div class="message-list" bind:this={div} on:scroll={setAutoScroll}>
		{#if messages}
			{#each messages as message, i}
				<ChatMessage
					{message}
					showHeader={i === 0 || (messages || [])[i - 1].author.id !== message.author.id}
				/>
			{/each}
		{/if}
		<div class="message-list-tail" />
	</div>
	<div class="footer">
		{#if !autoscroll}
			<div class="autoscroll-indicator" on:click={onClick}>
				<div class="older-messages-text">You're looking at older messages</div>
				<div class="jump-to-present-button">Jump To Present 🔽</div>
			</div>
		{/if}
		<ChatInput />
	</div>
</div>
