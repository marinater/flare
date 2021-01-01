<script lang="ts">
	import ChatInput from './ChatInput.svelte'
	import ChatMessage from './ChatMessage.svelte'
	import type { SocketForwardedMessage } from '../types'

	export let messages: SocketForwardedMessage[] | null
	export let channelName: string | null
</script>

<style>
	#root {
		flex-direction: column;
		flex: 8 0 auto;
		display: flex;
		align-items: stretch;
		padding: 20px;
	}

	#message-list {
		height: 100%;
		overflow-y: scroll;
		flex-direction: column;
		justify-content: flex-end;
		align-items: stretch;
	}

	#message-list-tail {
		height: 20px;
		flex-grow: 0;
		flex-shrink: 0;
	}

	#scroll-wrapper {
		overflow: hidden;
		flex: 1 1;
	}
</style>

<div id="root">
	<div id="scroll-wrapper">
		<div id="message-list">
			{#if messages}
				{#each messages as message}
					<ChatMessage {message} />
				{/each}
			{/if}
			<div id="message-list-tail" />
		</div>
	</div>
	<ChatInput
		placeholder={channelName ? `Message #${channelName}` : 'Run !link inside the server you want to receive updates for!'}
	/>
</div>
