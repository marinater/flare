<script lang="ts">
	import marked from 'marked'
	import DOMPurify from 'dompurify'

	import type { Message } from '../user-types'
	import dayjs from 'dayjs'
	import { patterns, discordID } from '../sockets'

	export let message: Message
	export let showHeader: boolean

	let parsedContent = ''
	let mentioned = false

	const transformContent = () => {
		let transformed = message.content
		mentioned = false

		if ($patterns?.everyone) {
			transformed = transformed.replace($patterns.everyone!, () => {
				console.log('set to true')
				mentioned = true
				return `[@everyone]`
			})
		}

		if ($patterns?.user) {
			transformed = transformed.replace($patterns.user!, (_, userID) => {
				if ($discordID === userID) {
					mentioned = true
				}

				return `[@user ${userID}]`
			})
		}

		return DOMPurify.sanitize(marked(transformed))
	}

	$: parsedContent = transformContent()
</script>

<style>
	.root {
		display: flex;
		flex-direction: row;
		align-items: stretch;
	}

	.avatar-container {
		height: 38px;
		width: 38px;
		position: relative;
	}

	.data-container {
		flex: 1 1;
		padding-left: 15px;
	}

	.info-row {
		line-height: 20px;
	}

	.avatar-img {
		width: 100%;
		height: 100%;
		display: inline-block;
		border-radius: 50%;
		position: absolute;
		top: 0;
	}

	.content-row {
		line-height: 18px;
	}

	:global(.content-row > p) {
		margin: 0;
	}

	.mentioned {
		background-color: var(--vscode-editor-inactiveSelectionBackground);
	}

	.info-author {
		font-weight: 600;
		padding-right: 3px;
	}

	.info-timestamp {
		font-size: smaller;
		color: var(--vscode-titleBar-inactiveForeground);
	}

	.attachment-image {
		border-radius: 5px;
		margin-top: 8px;
	}
</style>

<div class="root" style="padding-top: {showHeader ? '15px' : '3px'}">
	<div class="avatar-container" style="height: {showHeader ? '38px' : 'initial'}">
		{#if showHeader}<img class="avatar-img" alt="user avatar" src={message.author.pfp} />{/if}
	</div>
	<div class="data-container">
		{#if showHeader}
			<div class="info-row">
				<span class="info-author"> {message.author.name} </span>
				<span class="info-timestamp"> {dayjs(message.timestamp).format('MM/DD/YY [at] h:mm A')} </span>
			</div>
		{/if}
		<div class="content-row {mentioned ? 'mentioned' : ''}">
			{@html parsedContent}
		</div>
		<div class="attachment-container">
			{#each message.attachments as attachment}
				{#if attachment.height === null || attachment.width === null}
					<div><a href={attachment.url}> {attachment.name || '(Unamed file attachment)'} </a></div>
				{:else}
					<img
						class="attachment-image"
						alt={attachment.name || 'attached image'}
						src={attachment.url}
						style="height: {attachment.height}; width: {attachment.width};"
					/>
				{/if}
			{/each}
		</div>
	</div>
</div>
