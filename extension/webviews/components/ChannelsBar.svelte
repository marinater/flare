<script lang="ts">
	import type { ChannelInfo } from '../types'
	import Channel from './Channel.svelte'
	export let channels: ChannelInfo[] | null
	export let activeChannelID: string | null
	export let setActiveChannelID: (channelID: string) => void
</script>

<style>
	#root {
		background-color: var(--vscode-sideBar-background);
		overflow-x: hidden;
		flex: 0 0 240px;
		padding: 12px;
	}

	#header {
		height: 25px;
	}
</style>

<div id="root">
	<div id="header">TEXT CHANNELS</div>
	{#if channels}
		{#each channels as channel}
			<Channel
				channelInfo={channel}
				selected={channel.id === activeChannelID}
				onclick={() => setActiveChannelID(channel.id)}
			/>
		{/each}
	{/if}
</div>
